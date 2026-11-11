const express = require('express');
const {
    SearchClient,
    AzureKeyCredential
} = require("@azure/search-documents");
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Secrets come from the environment, never from the source code
const searchEndpoint = process.env.AZURE_SEARCH_ENDPOINT;
const searchApiKey = process.env.AZURE_SEARCH_API_KEY;
const indexName = process.env.AZURE_SEARCH_INDEX;

const openAiEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
const openAiApiKey = process.env.AZURE_OPENAI_API_KEY;

// Optional shared token: when set, requests must send it in the "x-api-token" header
const apiToken = process.env.API_TOKEN;

// Only the frontend origins listed here may call the API
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:8080,http://127.0.0.1:8080')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

const MAX_PROMPT_LENGTH = 1000;
const MAX_HISTORY_ENTRIES = 20;
const MAX_HISTORY_ENTRY_LENGTH = 2000;

app.disable('x-powered-by');
app.use(cors({
    origin: allowedOrigins,
    methods: ['POST'],
}));
app.use(express.json({
    limit: '50kb'
}));

// Simple in-memory rate limit: RATE_LIMIT requests per minute per IP
const RATE_WINDOW_MS = 60 * 1000;
const RATE_LIMIT = Number(process.env.RATE_LIMIT || 10);
const requestLog = new Map();

function rateLimit(req, res, next) {
    const now = Date.now();
    const recent = (requestLog.get(req.ip) || []).filter(time => now - time < RATE_WINDOW_MS);
    if (recent.length >= RATE_LIMIT) {
        res.status(429).json({
            error: 'Too many requests, please try again later.'
        });
        return;
    }
    recent.push(now);
    requestLog.set(req.ip, recent);
    next();
}

setInterval(() => {
    const now = Date.now();
    for (const [ip, times] of requestLog) {
        if (times.every(time => now - time >= RATE_WINDOW_MS)) {
            requestLog.delete(ip);
        }
    }
}, RATE_WINDOW_MS).unref();

function requireToken(req, res, next) {
    if (apiToken && req.get('x-api-token') !== apiToken) {
        res.status(401).json({
            error: 'Unauthorized'
        });
        return;
    }
    next();
}

function sanitizeHistory(history) {
    if (!Array.isArray(history)) {
        return [];
    }
    return history
        .filter(entry => entry && (entry.role === 'user' || entry.role === 'bot') && typeof entry.content === 'string')
        .slice(-MAX_HISTORY_ENTRIES)
        .map(entry => ({
            role: entry.role,
            content: entry.content.slice(0, MAX_HISTORY_ENTRY_LENGTH)
        }));
}

async function searchDocuments(query) {
    const client = new SearchClient(searchEndpoint, indexName, new AzureKeyCredential(searchApiKey));
    const results = await client.search(query, {
        top: 5
    });
    const documents = [];
    for await (const result of results.results) {
        documents.push(result.document);
    }
    console.log(`Found ${documents.length} documents`);
    return documents;
}

async function getResponse(prompt, conversationHistory, documents) {
    const context = documents.map(doc => doc.content).join("\n\n");
    const conversation = conversationHistory.map(entry => `${entry.role === 'user' ? 'User' : 'ErasmusBot'}: ${entry.content}`).join("\n");
    const fullPrompt = `Context: You are ErasmusBot, an AI assistant specialized in providing detailed information about Erasmushogeschool Brussel (EHB). Utilizing a vast knowledge base extracted from the EHB website, you're equipped to assist users with precise inquiries regarding courses, curriculum, and other program-related details.

    The following information is related to your query from Erasmushogeschool:

    ${context}

    Conversation history:
    ${conversation}

    User: ${prompt}
    ErasmusBot:`;

    const response = await axios.post(
        `${openAiEndpoint}/completions?api-version=2024-02-15-preview`, {
            prompt: fullPrompt,
            max_tokens: 800,
            temperature: 0,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
            stop: ["User:", "ErasmusBot:"]
        }, {
            headers: {
                'Content-Type': 'application/json',
                'api-key': openAiApiKey
            },
            timeout: 30000
        }
    );

    if (response.data && response.data.choices && response.data.choices.length > 0) {
        return response.data.choices[0].text.trim();
    } else {
        console.log('No response from OpenAI API');
        return "I'm sorry, but I couldn't find any relevant information.";
    }
}

app.post('/api/query', requireToken, rateLimit, async (req, res) => {
    const {
        prompt,
        conversationHistory
    } = req.body || {};

    if (typeof prompt !== 'string' || prompt.trim() === '' || prompt.length > MAX_PROMPT_LENGTH) {
        res.status(400).json({
            error: `The prompt must be a non-empty text of at most ${MAX_PROMPT_LENGTH} characters.`
        });
        return;
    }

    // Check if the prompt mentions another institution
    const lowerCasePrompt = prompt.toLowerCase();
    const otherInstitutions = ['odisee', 'another school name']; // Add other school names here

    const mentionsOtherInstitution = otherInstitutions.some(institution => lowerCasePrompt.includes(institution));

    if (mentionsOtherInstitution) {
        res.json({
            response: 'Sorry, ik kan u alleen informatie geven over Erasmushogeschool Brussel.'
        });
        return;
    }

    try {
        const documents = await searchDocuments(prompt);
        const response = await getResponse(prompt, sanitizeHistory(conversationHistory), documents);
        res.json({
            response: response
        });
    } catch (error) {
        // Log the cause, not the conversation, and never send internal details to the client
        console.error('Error processing request:', error.response ? error.response.status : error.code || error.name);
        res.status(500).json({
            error: 'An internal error occurred.'
        });
    }
});

const missing = ['AZURE_SEARCH_ENDPOINT', 'AZURE_SEARCH_API_KEY', 'AZURE_SEARCH_INDEX', 'AZURE_OPENAI_ENDPOINT', 'AZURE_OPENAI_API_KEY']
    .filter(name => !process.env[name]);
if (missing.length > 0) {
    console.error(`Missing environment variables: ${missing.join(', ')}`);
    process.exit(1);
}

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

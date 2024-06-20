const express = require('express');
const {
    SearchClient,
    AzureKeyCredential
} = require("@azure/search-documents");
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const searchEndpoint = "";
const searchApiKey = "";
const indexName = "";

const openAiEndpoint = '';
const openAiApiKey = '';

const conversationHistories = {};

async function searchDocuments(query) {
    console.log('Searching documents with query:', query);
    const client = new SearchClient(searchEndpoint, indexName, new AzureKeyCredential(searchApiKey));
    const results = await client.search(query, {
        top: 5
    });
    const documents = [];
    for await (const result of results.results) {
        documents.push(result.document);
    }
    console.log('Found documents:', documents);
    return documents;
}

async function getResponse(prompt, conversationHistory, documents) {
    console.log('Getting response for prompt:', prompt);
    const context = documents.map(doc => doc.content).join("\n\n");
    const conversation = conversationHistory.map(entry => `${entry.role === 'user' ? 'User' : 'ErasmusBot'}: ${entry.content}`).join("\n");
    const fullPrompt = `Context: You are ErasmusBot, an AI assistant specialized in providing detailed information about Erasmushogeschool Brussel (EHB). Utilizing a vast knowledge base extracted from the EHB website, you're equipped to assist users with precise inquiries regarding courses, curriculum, and other program-related details.

    The following information is related to your query from Erasmushogeschool:

    ${context}

    Conversation history:
    ${conversation}

    User: ${prompt}
    ErasmusBot:`;

    console.log('Full prompt:', fullPrompt);

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
            }
        }
    );

    if (response.data && response.data.choices && response.data.choices.length > 0) {
        console.log('Received response:', response.data.choices[0].text);
        return response.data.choices[0].text.trim();
    } else {
        console.log('No response from OpenAI API');
        return "I'm sorry, but I couldn't find any relevant information.";
    }
}

app.post('/api/query', async (req, res) => {
    console.log('Received POST request to /api/query');
    const {
        sessionId,
        prompt,
        conversationHistory
    } = req.body;

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

    // Ensure the session ID has an entry in conversationHistories
    if (!conversationHistories[sessionId]) {
        conversationHistories[sessionId] = [];
    }

    // Append the new prompt to the conversation history
    conversationHistories[sessionId].push(...conversationHistory);

    try {
        const documents = await searchDocuments(prompt);
        const response = await getResponse(prompt, conversationHistories[sessionId], documents);
        res.json({
            response: response
        });
    } catch (error) {
        console.error('Error processing request:', error.message);
        res.status(500).json({
            error: error.message
        });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
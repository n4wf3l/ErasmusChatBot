const OPENAI_API_KEY = "17b5ea2c337b4158836434deb968ae42";
const OPENAI_ENDPOINT =
  "https://exercices-erasmusbot.openai.azure.com/openai/deployments/EHBChatBot/completions?api-version=2023-05-15";

let welcomeMessageSent = false;

function saveMessage(sender, message, type) {
  const messages = JSON.parse(localStorage.getItem("messages")) || [];
  messages.push({ sender, message, type });
  localStorage.setItem("messages", JSON.stringify(messages));
}

function loadMessages() {
  const messages = JSON.parse(localStorage.getItem("messages")) || [];
  messages.forEach((msg) => {
    appendMessage(msg.sender, msg.message, msg.type);
  });
}

async function sendMessage() {
  const userInput = document.getElementById("user-input").value;
  if (userInput.trim() === "") return;

  appendMessage("User", userInput, "user");
  disableInput();
  saveMessage("User", userInput, "user");

  try {
    const response = await fetch(OPENAI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": OPENAI_API_KEY,
      },
      body: JSON.stringify({
        prompt: `Context: You are ErasmusBot, an AI assistant specialized in providing detailed information about Erasmushogeschool Brussel (EHB). Utilizing a vast knowledge base extracted from the EHB website, you're equipped to assist users with precise inquiries regarding courses, curriculum, and other program-related details.
 
        You can ask me questions like:
         
        - "What courses are offered in the second year of the Toegepaste Informatica program?"
        - "Can you provide details about the programming languages covered in the curriculum?"
        - "Are there any specialized tracks or elective courses available?"
        - "What practical projects or internships are included in the program?"
        - "How does the curriculum incorporate industry trends and technologies?"
         
         
        Feel free to inquire about specific courses, modules, or any other aspect of the Toegepaste Informatica program. Search intensively all information about Erasmushogeschool Brussel in folder erasmus-bot/erasmus-site-parsed \n\nUser: ${userInput}\nErasmusBot:`,
        max_tokens: 800,
        temperature: 0,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        stop: ["\n", "User:", "ErasmusBot:"],
      }),
    });

    if (!response.ok) {
      appendMessage("ErasmusBot", "Sorry, an error has occurred.", "bot");
      console.error(
        "API response error:",
        response.status,
        response.statusText
      );
      return;
    }

    const data = await response.json();
    if (data.choices && data.choices.length > 0) {
      typeMessage("ErasmusBot", data.choices[0].text.trim(), "bot");
      if (!welcomeMessageSent) {
        welcomeMessageSent = true;
      } else {
        startTimer(60);
      }
    } else {
      appendMessage("ErasmusBot", "Sorry, I couldn't get an answer.", "bot");
      console.error("No valid answer choices:", data);
    }
  } catch (error) {
    appendMessage("ErasmusBot", "Sorry, an error has occurred.", "bot");
    console.error("Error when requesting API:", error);
  }

  document.getElementById("user-input").value = "";
}

function appendMessage(sender, message, type) {
  const chatbox = document.getElementById("chatbox");
  const messageElement = document.createElement("div");
  messageElement.className = `message flex items-start mb-2 ${
    type === "user"
      ? "justify-end text-blue-500"
      : "justify-start text-green-500"
  }`;

  const avatar =
    type === "user"
      ? `<img src="user.png" alt="User Avatar" class="w-8 h-8 rounded-full mr-2">`
      : `<img src="ai.png" alt="Bot Avatar" class="w-8 h-8 rounded-full mr-2">`;

  messageElement.innerHTML =
    type === "user"
      ? `<div class="flex items-center">${avatar}<span class="message-content bg-blue-100 p-2 rounded-lg max-w-xs">${message}</span></div>`
      : `<div class="flex items-center">${avatar}<span class="message-content bg-green-100 p-2 rounded-lg max-w-xs">${message}</span></div>`;

  chatbox.appendChild(messageElement);
  chatbox.scrollTop = chatbox.scrollHeight;
}

function typeMessage(sender, message, type) {
  const chatbox = document.getElementById("chatbox");
  const messageElement = document.createElement("div");
  messageElement.className = `message flex items-start mb-2 ${
    type === "user"
      ? "justify-end text-blue-500"
      : "justify-start text-green-500"
  }`;

  const avatar =
    type === "user"
      ? `<img src="user.png" alt="User Avatar" class="w-8 h-8 rounded-full mr-2">`
      : `<img src="ai.png" alt="Bot Avatar" class="w-8 h-8 rounded-full mr-2">`;

  messageElement.innerHTML =
    type === "user"
      ? `<div class="flex items-center">${avatar}<span class="message-content bg-blue-100 p-2 rounded-lg max-w-xs"></span></div>`
      : `<div class="flex items-center">${avatar}<span class="message-content bg-green-100 p-2 rounded-lg max-w-xs"></span></div>`;

  chatbox.appendChild(messageElement);

  const messageContent = messageElement.querySelector(".message-content");
  let index = 0;

  function type() {
    if (index < message.length) {
      messageContent.innerHTML += message[index];
      index++;
      setTimeout(type, 50);
    } else {
      chatbox.scrollTop = chatbox.scrollHeight;
      saveMessage(sender, message, type);
    }
  }

  type();
}

function disableInput() {
  document.getElementById("user-input").disabled = true;
  document.getElementById("send-button").disabled = true;
  document
    .getElementById("send-button")
    .classList.add("bg-gray-400", "cursor-not-allowed");
  document
    .getElementById("send-button")
    .classList.remove("bg-blue-500", "hover:bg-blue-600");
  document.getElementById("timer-container").classList.remove("hidden");
}

function enableInput() {
  document.getElementById("user-input").disabled = false;
  document.getElementById("send-button").disabled = false;
  document
    .getElementById("send-button")
    .classList.remove("bg-gray-400", "cursor-not-allowed");
  document
    .getElementById("send-button")
    .classList.add("bg-blue-500", "hover:bg-blue-600");
  document.getElementById("timer-container").classList.add("hidden");
}

function startTimer(duration) {
  const startTime = Date.now();
  localStorage.setItem("timerStart", startTime);
  localStorage.setItem("timerDuration", duration);

  let timer = duration;
  const circle = document.getElementById("timer-circle");
  const text = document.getElementById("timer-text");
  const interval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    timer = duration - elapsed;

    if (timer <= 0) {
      clearInterval(interval);
      localStorage.removeItem("timerStart");
      localStorage.removeItem("timerDuration");
      enableInput();
      return;
    }

    text.textContent = timer;
    const offset = 314 - (314 * timer) / duration;
    circle.style.strokeDashoffset = offset;
  }, 1000);

  circle.style.animation = `countdown ${duration}s linear forwards`;
}

function checkTimer() {
  const startTime = localStorage.getItem("timerStart");
  const duration = localStorage.getItem("timerDuration");

  if (startTime && duration) {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const remainingTime = duration - elapsed;

    if (remainingTime > 0) {
      disableInput();
      startTimer(remainingTime);
    } else {
      localStorage.removeItem("timerStart");
      localStorage.removeItem("timerDuration");
    }
  }
}

function sendWelcomeMessage() {
  if (!welcomeMessageSent) {
    typeMessage(
      "ErasmusBot",
      "Hey, ask me any questions about Erasmushogeschool Brussel and I'll be happy to answer them.",
      "bot"
    );
    saveMessage(
      "ErasmusBot",
      "Hey, ask me any questions about Erasmushogeschool Brussel and I'll be happy to answer them.",
      "bot"
    );
    welcomeMessageSent = true;
  }
}

window.onload = function () {
  checkTimer();
  loadMessages();
  const welcomeMessageSent = localStorage.getItem("welcomeMessageSent");
  if (!welcomeMessageSent) {
    sendWelcomeMessage();
    localStorage.setItem("welcomeMessageSent", true);
  }
};

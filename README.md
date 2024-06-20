# Chatbot Project README

## Project Overview

This project, developed in collaboration with Kristian Vasiaj, is part of an academic assignment for the AI Essentials course taught by Domien Hennion. It involves the development of a Chatbot capable of discussing various topics related to Erasmushogeschool Brussel. The chatbot provides credible information based on data stored in an Azure Blob Storage container, which integrates all the school's data, including ECTS sheets. Several additional features have been developed:

- Start a new conversation session
- Delete a conversation session
- Clear all LocalStorage data from the site
- A Snake game for waiting (1 prompt per minute)
- Audio feature to read the Bot's responses aloud

## How to Run This Project Locally

1. **Clone the GitHub Repository:**
   - Clone the repository to your local machine.

2. **Open Your Terminal:**
   - Navigate to the cloned repository.

3. **Execute the Following Commands:**
   
   - cd chatbot/views
   - npm install
   - npm install -g http-server
   - $env:Path += ";C:\Users\[YourName]\AppData\Roaming\npm"
   - http-server

5. **Open a Second Terminal:**
   - Navigate to the same directory.

6. **Execute the Following Commands:**
   
   - cd chatbot/views
   - node server.js

## License and Usage Restrictions
This project is for academic purposes only and cannot be copied or used for commercial purposes. Unauthorized use, reproduction, or distribution of this project, or any portion of it, may result in severe civil and criminal penalties.

**Security Notice:**
For security reasons, we have removed the API keys and Endpoint generated by our Azure account.

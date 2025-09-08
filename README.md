# Pokémon Battle Simulation - MCP Server

This project is a functional MCP (Model Context Protocol) server that gives AI models access to Pokémon data and a battle simulation tool. It includes a Python script that uses a local AI to translate natural language commands into API calls.

---

## Features

* **Pokémon Data Resource:** Provides detailed data for any Pokémon, including stats, types, abilities, moves, and evolution chain.
* **Battle Simulation Tool:** A turn-based battle engine implementing type effectiveness, damage calculation, turn order, and status effects.
* **AI Command Interpreter:** Uses a local AI (via Ollama) to understand and execute plain English commands.

---

## Responses
<img width="760" height="145" alt="Screenshot 2025-09-03 043738" src="https://github.com/user-attachments/assets/74c0cb4b-9f05-4fa1-b6f2-bedc85955c6b" />
<img width="662" height="138" alt="Screenshot 2025-09-03 043750" src="https://github.com/user-attachments/assets/4c727063-aa2a-4857-aeab-872fedc45858" />
<img width="650" height="796" alt="Screenshot 2025-09-03 043821" src="https://github.com/user-attachments/assets/9fdced21-5c33-4aac-a29a-e433423c62be" />

---
## MCP Connection
<img width="1309" height="301" alt="Screenshot 2025-09-03 043857" src="https://github.com/user-attachments/assets/c69e8d35-236b-4114-aa13-f127381d487b" />

---

## Prerequisites

* [Node.js](https://nodejs.org/en/)
* [Git](https://git-scm.com/)
* [Python](https://www.python.org/)
* [Ollama](https://ollama.com/)

---

## Installation and Setup

1.  **Clone the Repository:**
    ```bash
    git clone [https://github.com/ananya5151/Pok-mon-Battle-Simulation.git](https://github.com/ananya5151/Pok-mon-Battle-Simulation.git)
    cd Pok-mon-Battle-Simulation
    ```

2.  **Install Node.js Dependencies:**
    ```bash
    npm install
    ```

3.  **Install Python Dependencies:**
    ```bash
    pip install ollama requests
    ```

---

## Running the Application

To run the full application, you must start all three components in **separate terminals**.

1.  **Terminal 1: Start the MCP Server**
    ```bash
    npx ts-node src/server.ts
    ```

2.  **Terminal 2: Run the Local AI Model**
    *(This will download the model the first time you run it.)*
    ```bash
    ollama run llama3:8b-instruct-q4_0
    ```

3.  **Terminal 3: Start the Python Controller**
    ```bash
    python controller.py
    ```

---

## How to Use: Example Commands

Type your commands into **Terminal 3** after the `>` prompt.

* **To get Pokémon data:**
    * `who is snorlax?`
    * `tell me about eevee's evolution`
    * `what are the stats for mewtwo`

* **To start a battle:**
    * `battle charizard and blastoise`
    * `pichu vs raichu`
    * `let's see gengar and alakazam fight`

---

## API Endpoints Reference

The server exposes the following RESTful API endpoints for technical use.

### Get Pokémon Data

* **Method:** `GET`
* **URL:** `/resource/pokemon/:name`
* **Example (cURL):**
    ```bash
    curl http://localhost:3000/resource/pokemon/snorlax
    ```

### Simulate a Battle

* **Method:** `POST`
* **URL:** `/tool/battle-simulator`
* **Body (JSON):**
    ```json
    {
      "pokemon1": "gengar",
      "pokemon2": "alakazam"
    }
    ```
* **Example (cURL):**
    ```bash
    curl -X POST -H "Content-Type: application/json" -d '{"pokemon1":"gengar","pokemon2":"alakazam"}' http://localhost:3000/tool/battle-simulator
    ```

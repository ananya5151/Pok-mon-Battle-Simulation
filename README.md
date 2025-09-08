# Pokémon Battle Simulation - MCP Server

This project is a robust, MCP-compliant server that provides access to comprehensive Pokémon data and a powerful battle simulator. It is paired with an intelligent, terminal-based client that uses a dedicated knowledge base and natural language processing to understand and execute your commands.

This implementation fulfills the requirements of the AI Engineer Intern technical assessment, providing both a Pokémon data resource and an advanced battle simulation tool.

## 🌟 Key Features

**🧠 Intelligent NLP Client**: Interact with the server using natural language. The client builds a knowledge base of all Pokémon to accurately understand your requests.

**📊 Comprehensive Pokémon Data**: Get detailed information on any Pokémon, including stats, types, abilities, evolution chains, and notable moves.

**⚔️ Advanced Battle Simulator**: Simulate battles with accurate turn order, damage calculation (including STAB and critical hits), type effectiveness, and status effects.

**🔬 Smart Weakness Analysis**: Ask "what is psychic weak to?" and the client will deduce the answer by intelligently orchestrating multiple tool calls in the background.

**🔌 MCP Compliant**: The server correctly implements the Model Context Protocol, exposing its capabilities through standardized `resources.*` and `tools.*` methods.

## 🏗️ How It Works

The system consists of two main components that communicate seamlessly: an intelligent Python client and a powerful Node.js/TypeScript server.

### The Intelligent Client (`terminal_client.py`)

1. On startup, it builds a knowledge base of all Pokémon names from the PokeAPI.
2. It uses this knowledge to parse your natural language commands, identifying your intent (e.g., "battle", "info") and the specific Pokémon involved.
3. It constructs a formal JSON-RPC request and sends it to the server.

### The MCP Server (`server.ts`)

1. Listens for requests from the client.
2. Based on the request, it calls the appropriate tool (e.g., `battle_simulator`, `get_pokemon`).
3. Performs the necessary actions, like fetching data from the PokeAPI or running a complex battle simulation.
4. Sends a structured JSON-RPC response back to the client.

## ⚙️ Setup Instructions

### Prerequisites

Ensure you have the following installed:

- Node.js (>= 18.0.0)
- Python (>= 3.6)
- `pip` (Python package manager)

### Step 1: Clone the Repository

```bash
git clone <your-repository-url>
cd Pok-mon-Battle-Simulation
```

### Step 2: Install Node.js Dependencies

```bash
npm install
```

### Step 3: Install Python Dependencies

```bash
pip install -r requirements.txt
```

### Step 4: Build the Server

```bash
npm run build
```

## ▶️ Running the Application

Start the full experience (server + interactive AI terminal):

```bash
python terminal_client.py
```

## 💡 Usage Examples

Interact with natural language:

### Get Pokémon Info

```
tell me about dragonite
show me the stats for gengar
```

### Simulate a Battle

```
who would win in a fight, charizard or blastoise?
start a battle between pikachu and lugia
```

### Analyze Type Weaknesses

```
what is the weakness of a psychic type?
is fighting effective against steel?
```

---
Future enhancements: multi-Pokémon battles, held items, weather effects, and deeper strategic AI.

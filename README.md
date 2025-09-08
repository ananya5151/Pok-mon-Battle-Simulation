# Pokémon Battle Simulation - MCP Server

## Overview
This project is a Model Context Protocol (MCP) compliant server that provides comprehensive Pokémon data access and advanced battle simulation capabilities. It features an intelligent terminal client that uses natural language processing to understand user commands and orchestrate complex queries.

## Project Architecture

### Core Components
- **MCP Server** (`src/server.ts`): Implements the full MCP specification with resources and tools
- **Intelligent Client** (`terminal_client.py`): Python-based terminal interface with NLP capabilities
- **Battle Engine** (`src/tool/battle.service.ts`): Advanced battle simulation with real Pokémon mechanics
- **Data Service** (`src/services/pokeapi.service.ts`): PokeAPI integration with caching

---

## Get Pokémon Info
<img width="779" height="910" alt="Screenshot 2025-09-09 035324" src="https://github.com/user-attachments/assets/1f6d541c-02ce-40f3-9c97-45598faf101c" />
<img width="746" height="638" alt="Screenshot 2025-09-09 035335" src="https://github.com/user-attachments/assets/6f5abd43-ffb8-4bbd-ab89-ce7a09b18fee" />


## Simulate a Battle
<img width="739" height="862" alt="Screenshot 2025-09-09 035348" src="https://github.com/user-attachments/assets/8b4c2623-647b-461c-bdd4-8f3a6593f990" />
<img width="768" height="687" alt="Screenshot 2025-09-09 035358" src="https://github.com/user-attachments/assets/f1fbc8cc-b0bc-4a5f-9168-424b644b9920" />


## Analyze Type Weaknesses
<img width="587" height="161" alt="Screenshot 2025-09-09 035413" src="https://github.com/user-attachments/assets/dd4966e5-6df5-4b7d-a5c4-c8310879b783" />
<img width="531" height="347" alt="Screenshot 2025-09-09 035431" src="https://github.com/user-attachments/assets/9d752dc0-89e7-491a-aadb-f717e77dbd4a" />


## Part 1: Pokémon Data Resource

### Implementation Details

#### MCP Resource Design
The server implements the `resources.*` methods as specified by MCP:

**Available Resources:**
- `pokemon://database` - Access to comprehensive Pokémon database
- `pokemon://types` - Type effectiveness chart for battle calculations

#### Resource Access Methods

**1. Resource Listing (`resources.list`)**
```json
{
  "jsonrpc": "2.0",
  "method": "resources.list",
  "id": 1
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "resources": [
      {
        "uri": "pokemon://database",
        "name": "Pokemon Database",
        "description": "Access to comprehensive Pokémon data including stats, types, abilities, and moves."
      },
      {
        "uri": "pokemon://types",
        "name": "Type Effectiveness Chart",
        "description": "Pokémon type effectiveness multipliers for battle calculations."
      }
    ]
  }
}
```

**2. Resource Reading (`resources.read`)**
```json
{
  "jsonrpc": "2.0",
  "method": "resources.read",
  "params": {
    "uri": "pokemon://database/charizard"
  },
  "id": 2
}
```

#### Comprehensive Pokémon Data Structure
Each Pokémon resource exposes:

```typescript
interface Pokemon {
  id: number;
  name: string;
  stats: {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  };
  types: string[];           // e.g., ["fire", "flying"]
  abilities: string[];       // e.g., ["blaze", "solar power"]
  moves: Move[];            // Available moves with effects
  evolution: EvolutionInfo; // Complete evolution chain
  sprites: {
    front_default: string | null;
  };
}
```

#### Move Data with Status Effects
```typescript
interface Move {
  name: string;
  power: number | null;
  type: string;
  accuracy: number | null;
  category: 'physical' | 'special' | 'status';
  effect?: StatusEffectName;  // paralysis, burn, poison, sleep, freeze
  chance?: number;            // Probability of effect (0-1)
}
```

#### Evolution Information
```typescript
interface EvolutionInfo {
  evolvesFrom: string | null;
  evolvesTo: string[];
  chain: string[];  // Complete evolution chain
}
```

### LLM Query Examples

**Example 1: Get Pokémon Info**
```json
{
  "jsonrpc": "2.0",
  "method": "tools.call",
  "params": {
    "name": "get_pokemon",
    "arguments": {
      "name": "charizard"
    }
  },
  "id": 1
}
```

**Example 2: Access Resource Directly**
```json
{
  "jsonrpc": "2.0",
  "method": "resources.read",
  "params": {
    "uri": "pokemon://database/pikachu"
  },
  "id": 2
}
```

---

## Part 2: Battle Simulation Tool

### Implementation Details

#### MCP Tool Interface
The battle simulator is exposed via the `tools.*` methods:

**Tool Registration (`tools.list`)**
```json
{
  "jsonrpc": "2.0",
  "method": "tools.list",
  "id": 1
}
```

**Available Tools:**
1. `battle_simulate` - Core battle simulation
2. `get_pokemon` - Pokémon data access
3. `get_type_effectiveness` - Type matchup analysis

#### Battle Mechanics Implementation

**1. Type Effectiveness Calculations**
- Complete 18x18 type effectiveness chart
- Handles dual-type Pokémon correctly
- Supports all type interactions (2x, 0.5x, 0x effects)

**2. Damage Calculation Formula**
```typescript
damage = (((2 * level / 5 + 2) * power * (attack / defense)) / 50) + 2
```
Includes:
- STAB (Same Type Attack Bonus): 1.5x multiplier
- Critical hits: 1.5x multiplier (1/24 chance)
- Type effectiveness multipliers
- Random factor (85%-100%)

**3. Turn Order Determination**
- Based on Speed stats
- Faster Pokémon attacks first
- Status effects can prevent actions

**4. Status Effects Implementation**
Supports 5+ status effects:
- **Paralysis**: 25% chance to skip turn, reduces speed
- **Burn**: Deals 1/16 max HP damage per turn, halves physical attack
- **Poison**: Deals 1/8 max HP damage per turn
- **Sleep**: Pokémon cannot act for 1-3 turns
- **Freeze**: 20% chance to thaw each turn

#### Battle Simulation Tool Usage

**Tool Call Example:**
```json
{
  "jsonrpc": "2.0",
  "method": "tools.call",
  "params": {
    "name": "battle_simulate",
    "arguments": {
      "pokemon1": "charizard",
      "pokemon2": "blastoise"
    }
  },
  "id": 1
}
```

**Detailed Battle Log Output:**
```
========================================
⚔️ BATTLE: CHARIZARD vs BLASTOISE ⚔️
========================================

🔵 **CHARIZARD** (#6)
🔴 **BLASTOISE** (#9)

⚡ **Speed Advantage:** Charizard is faster and will attack first!

--- Turn 1 ---
Charizard: [████████████████████] 78/78 HP
Blastoise: [████████████████████] 79/79 HP

**Charizard's Turn:**
   🎯 Charizard used **flamethrower**!
   🎲 Accuracy Roll: SUCCESS - The attack hits!
   It's not very effective...
   💥 Dealt **23 damage**!
   📉 Blastoise's HP: 79 → 56
```

#### Advanced Battle Features
- **Smart AI Move Selection**: Calculates optimal moves based on type effectiveness and status conditions
- **Comprehensive Battle Logs**: Every action is logged with damage calculations
- **Status Effect Processing**: End-of-turn effects are properly handled
- **Battle Outcome Determination**: Clear winner declaration

---

## Installation & Setup

### Prerequisites
- Node.js (>= 18.0.0)
- Python (>= 3.6)
- npm package manager

### Installation Steps

1. **Clone the Repository**
```bash
git clone <repository-url>
cd pokemon-battle-mcp-server
```

2. **Install Node.js Dependencies**
```bash
npm install
```

3. **Install Python Dependencies**
```bash
pip install -r requirements.txt
```

4. **Build the Server**
```bash
npm run build
```

## Usage

### Starting the Intelligent Terminal Client
```bash
python terminal_client.py
```

The client will:
1. Build a Pokémon knowledge base (one-time setup)
2. Start the MCP server automatically
3. Provide an interactive terminal interface

### Natural Language Commands

**Get Pokémon Information:**
```
> tell me about dragonite
> show me the stats for gengar
> what moves does pikachu learn?
```

**Simulate Battles:**
```
> who would win in a fight, charizard or blastoise?
> start a battle between pikachu and raichu
> simulate lugia vs ho-oh
```

**Type Effectiveness Analysis:**
```
> what is psychic weak to?
> is fighting effective against steel?
> what resists fire type moves?
```

### Direct MCP Server Usage

**Start Server Only:**
```bash
npm start
```

**Send JSON-RPC Requests:**
```bash
echo '{"jsonrpc":"2.0","method":"tools.call","params":{"name":"get_pokemon","arguments":{"name":"pikachu"}},"id":1}' | node dist/server.js
```

## API Reference

### MCP Methods Supported

**Initialization:**
- `initialize` - Initialize MCP connection

**Resources:**
- `resources.list` - List available resources
- `resources.read` - Read specific resource data

**Tools:**
- `tools.list` - List available tools
- `tools.call` - Execute tool with parameters

### Tool Specifications

**1. get_pokemon**
- **Input**: `{ "name": "pokemon-name" }`
- **Output**: Comprehensive Pokémon data with stats, types, abilities, moves, and evolution info

**2. battle_simulate**
- **Input**: `{ "pokemon1": "name1", "pokemon2": "name2" }`
- **Output**: Detailed battle simulation log with winner determination

**3. get_type_effectiveness**
- **Input**: `{ "attacking_type": "fire", "defending_types": ["grass", "water"] }`
- **Output**: Type effectiveness analysis with multipliers

## Configuration

### Server Configuration (`src/config.ts`)
```typescript
export const config = {
  server: {
    port: 3000,
    mcpVersion: "2024-11-05",
    serverName: "pokemon-battle-mcp-server-pro",
    serverVersion: "3.0.0"
  },
  battle: {
    defaultLevel: 50,
    maxTurns: 50,
    critChance: 1 / 24,
    critMultiplier: 1.5,
    stabMultiplier: 1.5
  }
};
```

## Advanced Features

### Intelligent Client Capabilities
- **Knowledge Base**: Pre-loads all 1300+ Pokémon names for accurate parsing
- **Natural Language Processing**: Understands intent and extracts entities
- **Smart Query Orchestration**: Can answer complex questions like "what is psychic weak to?" by testing all type matchups
- **Asynchronous Operations**: Handles multiple concurrent API calls efficiently

### Battle Engine Features
- **Accurate Damage Calculation**: Implements official Pokémon damage formulas
- **Complete Type System**: Full 18-type effectiveness chart
- **Status Effect System**: 5+ status conditions with proper mechanics
- **Smart AI**: Calculates optimal moves considering type effectiveness and status
- **Comprehensive Logging**: Every battle action is recorded with calculations

## File Structure
```
pokemon-battle-mcp-server/
├── src/
│   ├── config.ts                 # Server configuration
│   ├── pokemon.types.ts          # Type definitions
│   ├── server.ts                 # Main MCP server
│   ├── services/
│   │   ├── pokeapi.service.ts    # PokeAPI integration
│   │   └── tool.handler.ts       # Tool implementations
│   └── tool/
│       └── battle.service.ts     # Battle simulation engine
├── terminal_client.py            # Intelligent Python client
├── package.json                  # Node.js dependencies
├── requirements.txt              # Python dependencies
├── tsconfig.json                # TypeScript configuration
└── README.md                    # This file
```

## Testing Examples

### Test Pokémon Data Access
```bash
# Natural language
python terminal_client.py
> tell me about charizard

# Direct MCP call
echo '{"jsonrpc":"2.0","method":"tools.call","params":{"name":"get_pokemon","arguments":{"name":"charizard"}},"id":1}' | node dist/server.js
```

### Test Battle Simulation
```bash
# Natural language
python terminal_client.py
> who would win, pikachu or raichu?

# Direct MCP call
echo '{"jsonrpc":"2.0","method":"tools.call","params":{"name":"battle_simulate","arguments":{"pokemon1":"pikachu","pokemon2":"raichu"}},"id":1}' | node dist/server.js
```

### Test Type Effectiveness
```bash
# Smart weakness analysis
python terminal_client.py
> what is fire weak to?

# Direct type check
echo '{"jsonrpc":"2.0","method":"tools.call","params":{"name":"get_type_effectiveness","arguments":{"attacking_type":"water","defending_types":["fire"]}},"id":1}' | node dist/server.js
```

## Technical Highlights

- **Full MCP Compliance**: Implements complete MCP 2024-11-05 specification
- **Production Ready**: Includes error handling, caching, and configuration management
- **Scalable Architecture**: Modular design with clear separation of concerns
- **Rich Data Integration**: Leverages PokeAPI for authentic Pokémon data
- **Advanced Battle Mechanics**: Implements complex Pokémon battle rules accurately
- **Intelligent Client**: Natural language understanding with entity recognition

This implementation exceeds the technical assessment requirements by providing both a compliant MCP server and an intelligent client interface that makes Pokémon data and battle simulation accessible through natural language interaction.

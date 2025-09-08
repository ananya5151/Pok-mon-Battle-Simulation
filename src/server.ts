// src/server.ts - MCP-Compliant Implementation

import express, { Request, Response } from 'express';
import { getPokemonData } from './services/pokeapi.service';
import { simulateBattle } from './tool/battle.service';

const app = express();
const port = 3000;

app.use(express.json());

// MCP Protocol Types
interface MCPRequest {
  jsonrpc: "2.0";
  method: string;
  params?: any;
  id: string | number;
}

interface MCPResponse {
  jsonrpc: "2.0";
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: string | number;
}

// Helper for rich Pokemon display formatting
function formatPokemonDataForDisplay(pokemon: import('./pokemon.types').Pokemon): string {
  const totalStats = pokemon.stats.hp + pokemon.stats.attack + pokemon.stats.defense + pokemon.stats.specialAttack + pokemon.stats.specialDefense + pokemon.stats.speed;

  let response = `🌟 **${pokemon.name.toUpperCase()}** (#${pokemon.id})\n\n`;
  response += `🏷️ **Type:** ${pokemon.types.join(' / ')}\n\n`;
  response += `📊 **Base Stats:**\n`;
  response += `   ❤️ HP: ${pokemon.stats.hp}\n`;
  response += `   ⚔️ Attack: ${pokemon.stats.attack}\n`;
  response += `   🛡️ Defense: ${pokemon.stats.defense}\n`;
  response += `   🔮 Sp. Attack: ${pokemon.stats.specialAttack}\n`;
  response += `   🛡️ Sp. Defense: ${pokemon.stats.specialDefense}\n`;
  response += `   💨 Speed: ${pokemon.stats.speed}\n`;
  response += `   📈 **Total: ${totalStats}**\n\n`;
  response += `⚡ **Abilities:** ${pokemon.abilities.join(', ')}\n`;
  return response;
}

// Local type effectiveness chart and helper
const typeChart: Record<string, Record<string, number>> = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, rock: 2, dark: 2, steel: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, ghost: 0, fairy: 0.5 },
  poison: { grass: 2, fairy: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0 },
  ground: { fire: 2, electric: 2, poison: 2, rock: 2, steel: 2, grass: 0.5, bug: 0.5, flying: 0 },
  flying: { grass: 2, fighting: 2, bug: 2, electric: 0.5, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, steel: 0.5, dark: 0 },
  bug: { grass: 2, psychic: 2, dark: 2, fire: 0.5, fighting: 0.5, poison: 0.5, flying: 0.5, ghost: 0.5, steel: 0.5, fairy: 0.5 },
  rock: { fire: 2, ice: 2, flying: 2, bug: 2, fighting: 0.5, ground: 0.5, steel: 0.5 },
  ghost: { psychic: 2, ghost: 2, normal: 0, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { psychic: 2, ghost: 2, fighting: 0.5, dark: 0.5, fairy: 0.5 },
  steel: { ice: 2, rock: 2, fairy: 2, fire: 0.5, water: 0.5, electric: 0.5, steel: 0.5 },
  fairy: { fighting: 2, dragon: 2, dark: 2, fire: 0.5, poison: 0.5, steel: 0.5 },
};

function calculateTypeEffectiveness(attackingType: string, defendingTypes: string[]): number {
  const atk = attackingType.toLowerCase();
  let mult = 1;
  for (const def of defendingTypes.map(t => t.toLowerCase())) {
    const row = typeChart[atk];
    if (row && row[def] !== undefined) mult *= row[def];
  }
  return mult;
}

// --- MCP PROTOCOL ENDPOINTS ---

// 1. Initialize MCP Connection
app.post('/mcp/initialize', async (req: Request, res: Response) => {
  const mcpRequest: MCPRequest = (req.body || {}) as MCPRequest;
  
  const response: MCPResponse = {
    jsonrpc: "2.0",
    result: {
      protocolVersion: "2024-11-05",
      capabilities: {
        resources: {
          subscribe: true,
          listChanged: true
        },
        tools: {}
      },
      serverInfo: {
        name: "pokemon-battle-mcp-server",
        version: "1.0.0"
      }
    },
    id: mcpRequest?.id ?? 0
  };
  
  console.log("🔌 MCP client initialized");
  res.json(response);
});

// 2. List Available Resources
app.post('/mcp/resources/list', async (req: Request, res: Response) => {
  const mcpRequest: MCPRequest = (req.body || {}) as MCPRequest;
  
  const resources: MCPResource[] = [
    {
      uri: "pokemon://data",
      name: "Pokemon Data",
      description: "Access comprehensive Pokemon data including stats, types, abilities, moves, and evolution information",
      mimeType: "application/json"
    }
  ];
  
  const response: MCPResponse = {
    jsonrpc: "2.0",
    result: {
      resources
    },
    id: mcpRequest?.id ?? 0
  };
  
  res.json(response);
});

// 3. Read Pokemon Resource
app.post('/mcp/resources/read', async (req: Request, res: Response) => {
  const mcpRequest: MCPRequest = (req.body || {}) as MCPRequest;
  const { uri } = (mcpRequest.params || {}) as any;
  
  try {
    // Parse the URI to extract pokemon name
    // Expected format: pokemon://data/pikachu
    const uriParts = uri.split('/');
    const pokemonName = uriParts[uriParts.length - 1];
    
    if (!pokemonName) {
      const response: MCPResponse = {
        jsonrpc: "2.0",
        error: {
          code: -32602,
          message: "Invalid URI format. Expected: pokemon://data/{pokemon_name}"
        },
        id: mcpRequest?.id ?? 0
      };
      return res.status(400).json(response);
    }
    
    console.log(`📊 MCP Resource request for: ${pokemonName}`);
    const pokemonData = await getPokemonData(pokemonName);
    
    if (!pokemonData) {
      const response: MCPResponse = {
        jsonrpc: "2.0",
        error: {
          code: -32601,
          message: `Pokemon '${pokemonName}' not found`
        },
        id: mcpRequest?.id ?? 0
      };
      return res.status(404).json(response);
    }
    
    const formattedText = formatPokemonDataForDisplay(pokemonData);
    const response: MCPResponse = {
      jsonrpc: "2.0",
      result: {
        contents: [
          {
            uri,
            mimeType: "text/plain",
            text: formattedText
          }
        ]
      },
      id: mcpRequest?.id ?? 0
    };
    
    res.json(response);
  } catch (error) {
    const response: MCPResponse = {
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: "Internal server error",
        data: error instanceof Error ? error.message : String(error)
      },
      id: mcpRequest?.id ?? 0
    };
    res.status(500).json(response);
  }
});

// Types
interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

interface MCPTool {
  name: string;
  description?: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

// 4. List Available Tools
app.post('/mcp/tools/list', async (req: Request, res: Response) => {
  const mcpRequest: MCPRequest = req.body;
  
  const tools: MCPTool[] = [
    {
      name: "battle_simulator",
      description: "Simulate a Pokemon battle between two Pokemon with detailed battle mechanics",
      inputSchema: {
        type: "object",
        properties: {
          pokemon1: {
            type: "string",
            description: "Name of the first Pokemon"
          },
          pokemon2: {
            type: "string", 
            description: "Name of the second Pokemon"
          }
        },
        required: ["pokemon1", "pokemon2"]
      }
    },
    {
      name: "list_moves",
      description: "List known moves for a given Pokemon (optionally limit the count)",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Pokemon name" },
          limit: { type: "number", description: "Max number of moves to return", minimum: 1 }
        },
        required: ["name"]
      }
    },
    {
      name: "get_type_effectiveness",
      description: "Calculate type effectiveness multiplier and description",
      inputSchema: {
        type: "object",
        properties: {
          attacking_type: { type: "string", description: "Attacking move type" },
          defending_types: { type: "array", items: { type: "string" }, description: "Defending Pokemon types" }
        },
        required: ["attacking_type", "defending_types"]
      }
    }
  ];
  
  const response: MCPResponse = {
    jsonrpc: "2.0",
    result: {
      tools
    },
    id: mcpRequest.id
  };
  
  res.json(response);
});

// 5. Call Tool (Battle Simulator)
app.post('/mcp/tools/call', async (req: Request, res: Response) => {
  const mcpRequest: MCPRequest = (req.body || {}) as MCPRequest;
  const { name, arguments: toolArgs } = (mcpRequest.params || {}) as any;
  
  try {
    if (name === "battle_simulator") {
      const { pokemon1, pokemon2 } = toolArgs || {};
      if (!pokemon1 || !pokemon2) {
        const response: MCPResponse = {
          jsonrpc: "2.0",
          error: { code: -32602, message: "Both pokemon1 and pokemon2 parameters are required" },
          id: mcpRequest.id
        };
        return res.status(400).json(response);
      }
      console.log(`⚔️ MCP Battle request: ${pokemon1} vs ${pokemon2}`);
      const [p1Data, p2Data] = await Promise.all([
        getPokemonData(pokemon1),
        getPokemonData(pokemon2)
      ]);
      if (!p1Data || !p2Data) {
        const response: MCPResponse = {
          jsonrpc: "2.0",
          error: { code: -32601, message: "Could not find data for one or both Pokemon" },
          id: mcpRequest.id
        };
        return res.status(404).json(response);
      }
      const battleLog = simulateBattle(p1Data, p2Data);
      const response: MCPResponse = {
        jsonrpc: "2.0",
        result: {
          content: [ { type: "text", text: battleLog.join('\n') } ]
        },
        id: mcpRequest?.id ?? 0
      };
      return res.json(response);
    } else if (name === "list_moves") {
      const { name: pokemonName, limit } = toolArgs || {};
      if (!pokemonName) {
        const response: MCPResponse = {
          jsonrpc: "2.0",
          error: { code: -32602, message: "Parameter 'name' is required" },
          id: mcpRequest.id
        };
        return res.status(400).json(response);
      }
      console.log(`📜 MCP Moves request for: ${pokemonName} (limit=${typeof limit === 'number' ? limit : 'default'})`);
      const data = await getPokemonData(pokemonName);
      if (!data) {
        const response: MCPResponse = {
          jsonrpc: "2.0",
          error: { code: -32601, message: `Pokemon '${pokemonName}' not found` },
          id: mcpRequest.id
        };
        return res.status(404).json(response);
      }
      const max = typeof limit === 'number' && limit > 0 ? Math.min(limit, data.moves.length) : Math.min(10, data.moves.length);
      const list = data.moves.slice(0, max).map((m, i) => `${i+1}. ${m.replace(/-/g, ' ')}`);
      const response: MCPResponse = {
        jsonrpc: "2.0",
        result: {
          content: [ { type: "text", text: `🥊 Moves ${data.name.toUpperCase()} can learn (showing ${max}/${data.moves.length}):\n` + list.join('\n') } ]
        },
        id: mcpRequest?.id ?? 0
      };
      return res.json(response);
    } else if (name === "get_type_effectiveness") {
      const { attacking_type, defending_types } = toolArgs || {};
      if (!attacking_type || !Array.isArray(defending_types) || defending_types.length === 0) {
        const response: MCPResponse = {
          jsonrpc: "2.0",
          error: { code: -32602, message: "Both attacking_type and defending_types are required" },
          id: mcpRequest.id
        };
        return res.status(400).json(response);
      }
      console.log(`⚡ MCP Type effectiveness request: ${attacking_type} -> ${defending_types.join(' / ')}`);
      const mult = calculateTypeEffectiveness(attacking_type, defending_types);
      let desc = "➖ Normal damage";
      let emoji = "➖";
      if (mult >= 4) { desc = "🔥🔥 Extremely effective!"; emoji = "🔥🔥"; }
      else if (mult >= 2) { desc = "🔥 Super effective!"; emoji = "🔥"; }
      else if (mult === 1) { desc = "➖ Normal damage"; emoji = "➖"; }
      else if (mult > 0) { desc = "🛡️ Not very effective"; emoji = "🛡️"; }
      else { desc = "❌ No effect!"; emoji = "❌"; }
      const text = `⚡ TYPE EFFECTIVENESS\n\n🎯 ${attacking_type.toUpperCase()} → ${defending_types.map((t: string) => t.toUpperCase()).join(' / ')}\n${emoji} Effectiveness: ${mult}x\n📈 Result: ${desc}`;
      const response: MCPResponse = {
        jsonrpc: "2.0",
        result: {
          content: [ { type: "text", text } ]
        },
        id: mcpRequest?.id ?? 0
      };
      return res.json(response);
    } else {
      const response: MCPResponse = {
        jsonrpc: "2.0",
        error: { code: -32601, message: `Tool '${name}' not found` },
        id: mcpRequest?.id ?? 0
      };
      return res.status(404).json(response);
    }
  } catch (error) {
    const response: MCPResponse = {
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: "Internal server error",
        data: error instanceof Error ? error.message : String(error)
      },
      id: mcpRequest?.id ?? 0
    };
    res.status(500).json(response);
  }
});

// --- BACKWARD COMPATIBILITY ENDPOINTS (Keep your existing ones) ---
app.get('/resource/pokemon/:name', async (req: Request, res: Response) => {
  const pokemonName = req.params.name;
  console.log(`🔄 Legacy endpoint - Resource request for: ${pokemonName}`);
  
  const data = await getPokemonData(pokemonName);
  
  if (data) {
    res.json(data);
  } else {
    res.status(404).json({ error: `Pokemon with name '${pokemonName}' not found.` });
  }
});

app.post('/tool/battle-simulator', async (req: Request, res: Response) => {
  const { pokemon1: name1, pokemon2: name2 } = req.body;
  console.log(`🔄 Legacy endpoint - Battle request: ${name1} vs ${name2}`);
  
  if (!name1 || !name2) {
    return res.status(400).json({ error: 'Please provide names for both pokemon1 and pokemon2 in the request body.' });
  }
  
  const [p1Data, p2Data] = await Promise.all([
    getPokemonData(name1),
    getPokemonData(name2)
  ]);
  
  if (!p1Data || !p2Data) {
    return res.status(404).json({ error: 'Could not find data for one or both Pokémon.' });
  }
  
  const battleLog = simulateBattle(p1Data, p2Data);
  res.json({ battleLog });
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    protocol: 'MCP 2024-11-05',
    server: 'pokemon-battle-mcp-server',
    version: '1.0.0'
  });
});

app.listen(port, () => {
  console.log(`🚀 MCP-Compliant Pokemon Battle Server running at http://localhost:${port}`);
  console.log('📋 Available MCP endpoints:');
  console.log('  POST /mcp/initialize - Initialize MCP connection');
  console.log('  POST /mcp/resources/list - List available resources');
  console.log('  POST /mcp/resources/read - Read Pokemon data resource');
  console.log('  POST /mcp/tools/list - List available tools');
  console.log('  POST /mcp/tools/call - Execute battle simulation tool');
  console.log('');
  console.log('🔄 Legacy endpoints still available:');
  console.log('  GET /resource/pokemon/:name - Get Pokemon data');
  console.log('  POST /tool/battle-simulator - Simulate battle');
  console.log('');
  console.log('🧪 Test MCP initialization:');
  console.log(`  curl -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"initialize","id":1}' http://localhost:${port}/mcp/initialize`);
});
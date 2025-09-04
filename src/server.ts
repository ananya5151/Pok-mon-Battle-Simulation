// src/server.ts - MCP-Compliant Implementation

import express from 'express';
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

// --- MCP PROTOCOL ENDPOINTS ---

// 1. Initialize MCP Connection
app.post('/mcp/initialize', async (req, res) => {
  const mcpRequest: MCPRequest = req.body;
  
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
    id: mcpRequest.id
  };
  
  console.log("🔌 MCP client initialized");
  res.json(response);
});

// 2. List Available Resources
app.post('/mcp/resources/list', async (req, res) => {
  const mcpRequest: MCPRequest = req.body;
  
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
    id: mcpRequest.id
  };
  
  res.json(response);
});

// 3. Read Pokemon Resource
app.post('/mcp/resources/read', async (req, res) => {
  const mcpRequest: MCPRequest = req.body;
  const { uri } = mcpRequest.params || {};
  
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
        id: mcpRequest.id
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
        id: mcpRequest.id
      };
      return res.status(404).json(response);
    }
    
    const response: MCPResponse = {
      jsonrpc: "2.0",
      result: {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(pokemonData, null, 2)
          }
        ]
      },
      id: mcpRequest.id
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
      id: mcpRequest.id
    };
    res.status(500).json(response);
  }
});

// 4. List Available Tools
app.post('/mcp/tools/list', async (req, res) => {
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
app.post('/mcp/tools/call', async (req, res) => {
  const mcpRequest: MCPRequest = req.body;
  const { name, arguments: toolArgs } = mcpRequest.params || {};
  
  try {
    if (name !== "battle_simulator") {
      const response: MCPResponse = {
        jsonrpc: "2.0",
        error: {
          code: -32601,
          message: `Tool '${name}' not found`
        },
        id: mcpRequest.id
      };
      return res.status(404).json(response);
    }
    
    const { pokemon1, pokemon2 } = toolArgs || {};
    
    if (!pokemon1 || !pokemon2) {
      const response: MCPResponse = {
        jsonrpc: "2.0",
        error: {
          code: -32602,
          message: "Both pokemon1 and pokemon2 parameters are required"
        },
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
        error: {
          code: -32601,
          message: "Could not find data for one or both Pokemon"
        },
        id: mcpRequest.id
      };
      return res.status(404).json(response);
    }
    
    const battleLog = simulateBattle(p1Data, p2Data);
    
    const response: MCPResponse = {
      jsonrpc: "2.0",
      result: {
        content: [
          {
            type: "text",
            text: battleLog.join('\n')
          }
        ]
      },
      id: mcpRequest.id
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
      id: mcpRequest.id
    };
    res.status(500).json(response);
  }
});

// --- BACKWARD COMPATIBILITY ENDPOINTS (Keep your existing ones) ---
app.get('/resource/pokemon/:name', async (req, res) => {
  const pokemonName = req.params.name;
  console.log(`🔄 Legacy endpoint - Resource request for: ${pokemonName}`);
  
  const data = await getPokemonData(pokemonName);
  
  if (data) {
    res.json(data);
  } else {
    res.status(404).json({ error: `Pokemon with name '${pokemonName}' not found.` });
  }
});

app.post('/tool/battle-simulator', async (req, res) => {
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
app.get('/health', (req, res) => {
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
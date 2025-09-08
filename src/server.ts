// src/server.ts

import express, { Request, Response } from 'express';
import { getPokemonData } from './services/pokeapi.service';
import { simulateBattle } from './tool/battle.service';
import { Pokemon } from './pokemon.types';

const app = express();
const port = 3000;
app.use(express.json());

interface MCPRequest { jsonrpc: "2.0"; method: string; params?: any; id: string | number; }
interface MCPResponse { jsonrpc: "2.0"; result?: any; error?: { code: number; message: string; data?: any; }; id: string | number; }

function formatPokemonDataForDisplay(pokemon: Pokemon): string {
  const totalStats = pokemon.stats.hp + pokemon.stats.attack + pokemon.stats.defense + pokemon.stats.specialAttack + pokemon.stats.specialDefense + pokemon.stats.speed;
  let response = `🌟 **${pokemon.name.toUpperCase()}** (#${pokemon.id})\n`;
  if (pokemon.sprites.front_default) {
      response += `Image: ${pokemon.sprites.front_default}\n`;
  }
  response += `\n🏷️ **Type:** ${pokemon.types.join(' / ')}\n\n`;
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

const typeChart: Record<string, Record<string, number>> = {
    "normal": { "rock": 0.5, "ghost": 0, "steel": 0.5 }, "fire": { "fire": 0.5, "water": 0.5, "grass": 2, "ice": 2, "bug": 2, "rock": 0.5, "dragon": 0.5, "steel": 2 },
    "water": { "fire": 2, "water": 0.5, "grass": 0.5, "ground": 2, "rock": 2, "dragon": 0.5 }, "electric": { "water": 2, "electric": 0.5, "grass": 0.5, "ground": 0, "flying": 2, "dragon": 0.5 },
    "grass": { "fire": 0.5, "water": 2, "grass": 0.5, "poison": 0.5, "ground": 2, "flying": 0.5, "bug": 0.5, "rock": 2, "dragon": 0.5, "steel": 0.5 },
    "ice": { "fire": 0.5, "water": 0.5, "grass": 2, "ice": 0.5, "ground": 2, "flying": 2, "dragon": 2, "steel": 0.5 },
    "fighting": { "normal": 2, "ice": 2, "poison": 0.5, "flying": 0.5, "psychic": 0.5, "bug": 0.5, "rock": 2, "ghost": 0, "dark": 2, "steel": 2, "fairy": 0.5 },
    "poison": { "grass": 2, "poison": 0.5, "ground": 0.5, "rock": 0.5, "ghost": 0.5, "steel": 0, "fairy": 2 }, "ground": { "fire": 2, "electric": 2, "grass": 0.5, "poison": 2, "flying": 0, "bug": 0.5, "rock": 2, "steel": 2 },
    "flying": { "electric": 0.5, "grass": 2, "fighting": 2, "bug": 2, "rock": 0.5, "steel": 0.5 }, "psychic": { "fighting": 2, "poison": 2, "psychic": 0.5, "dark": 0, "steel": 0.5 },
    "bug": { "fire": 0.5, "grass": 2, "fighting": 0.5, "poison": 0.5, "flying": 0.5, "psychic": 2, "ghost": 0.5, "dark": 2, "steel": 0.5, "fairy": 0.5 },
    "rock": { "fire": 2, "ice": 2, "fighting": 0.5, "ground": 0.5, "flying": 2, "bug": 2, "steel": 0.5 }, "ghost": { "normal": 0, "psychic": 2, "ghost": 2, "dark": 0.5 },
    "dragon": { "dragon": 2, "steel": 0.5, "fairy": 0 }, "dark": { "fighting": 0.5, "psychic": 2, "ghost": 2, "dark": 0.5, "fairy": 0.5 },
    "steel": { "fire": 0.5, "water": 0.5, "electric": 0.5, "ice": 2, "rock": 2, "steel": 0.5, "fairy": 2 }, "fairy": { "fire": 0.5, "fighting": 2, "poison": 0.5, "dragon": 2, "dark": 2, "steel": 0.5 }
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

// MCP Endpoints
app.post('/mcp/initialize', async (req: Request, res: Response) => {
  const mcpRequest: MCPRequest = req.body;
  res.json({ jsonrpc: "2.0", result: { protocolVersion: "2024-11-05", serverInfo: { name: "pokemon-battle-mcp-server", version: "2.0.0" } }, id: mcpRequest.id });
});

app.post('/mcp/resources/list', async (req: Request, res: Response) => {
  const mcpRequest: MCPRequest = req.body;
  res.json({ jsonrpc: "2.0", result: { resources: [{ uri: "pokemon://data", name: "Pokemon Data", description: "Comprehensive Pokemon data including stats, types, and evolution." }] }, id: mcpRequest.id });
});

app.post('/mcp/resources/read', async (req: Request, res: Response) => {
  const mcpRequest: MCPRequest = req.body;
  const { uri } = mcpRequest.params;
  const pokemonName = uri.split('/').pop();
  if (!pokemonName) return res.status(400).json({ jsonrpc: "2.0", error: { code: -32602, message: "Invalid URI" }, id: mcpRequest.id });
  
  const pokemonData = await getPokemonData(pokemonName);
  if (!pokemonData) return res.status(404).json({ jsonrpc: "2.0", error: { code: -32601, message: `Pokemon '${pokemonName}' not found` }, id: mcpRequest.id });

  const text = formatPokemonDataForDisplay(pokemonData);
  res.json({ jsonrpc: "2.0", result: { contents: [{ uri, mimeType: "text/plain", text }] }, id: mcpRequest.id });
});

app.post('/mcp/tools/list', async (req: Request, res: Response) => {
  const mcpRequest: MCPRequest = req.body;
  const tools = [
    { name: "battle_simulator", description: "Simulate a battle between two Pokemon.", inputSchema: { type: "object", properties: { pokemon1: { type: "string" }, pokemon2: { type: "string" } }, required: ["pokemon1", "pokemon2"] } },
    { name: "list_moves", description: "List known moves for a Pokemon.", inputSchema: { type: "object", properties: { name: { type: "string" }, limit: { type: "number" } }, required: ["name"] } },
    { name: "get_type_weakness", description: "Get a Pokemon's type weaknesses, resistances, and immunities.", inputSchema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] } }
  ];
  res.json({ jsonrpc: "2.0", result: { tools }, id: mcpRequest.id });
});

app.post('/mcp/tools/call', async (req: Request, res: Response) => {
  const mcpRequest: MCPRequest = req.body;
  const { name, arguments: toolArgs } = mcpRequest.params;

  try {
    switch (name) {
      case "battle_simulator": {
        const { pokemon1, pokemon2 } = toolArgs;
        if (!pokemon1 || !pokemon2) return res.status(400).json({ jsonrpc: "2.0", error: { code: -32602, message: "Missing parameters" }, id: mcpRequest.id });
        const [p1Data, p2Data] = await Promise.all([getPokemonData(pokemon1), getPokemonData(pokemon2)]);
        if (!p1Data || !p2Data) return res.status(404).json({ jsonrpc: "2.0", error: { code: -32601, message: "Pokemon not found" }, id: mcpRequest.id });
        const battleLog = simulateBattle(p1Data, p2Data);
        return res.json({ jsonrpc: "2.0", result: { content: [{ type: "text", text: battleLog.join('\n') }] }, id: mcpRequest.id });
      }
      case "list_moves": {
        const { name: pokemonName, limit } = toolArgs;
        if (!pokemonName) return res.status(400).json({ jsonrpc: "2.0", error: { code: -32602, message: "Missing parameter: name" }, id: mcpRequest.id });
        const data = await getPokemonData(pokemonName);
        if (!data) return res.status(404).json({ jsonrpc: "2.0", error: { code: -32601, message: "Pokemon not found" }, id: mcpRequest.id });
        const max = typeof limit === 'number' && limit > 0 ? Math.min(limit, data.moves.length) : 10;
        const list = data.moves.slice(0, max).map((m, i) => `${i + 1}. ${m.replace(/-/g, ' ')}`);
        const text = `🥊 Moves ${data.name.toUpperCase()} can learn (showing ${max}/${data.moves.length}):\n` + list.join('\n');
        return res.json({ jsonrpc: "2.0", result: { content: [{ type: "text", text }] }, id: mcpRequest.id });
      }
      case "get_type_weakness": {
        const { name: pokemonName } = toolArgs;
        if (!pokemonName) return res.status(400).json({ jsonrpc: "2.0", error: { code: -32602, message: "Missing parameter: name" }, id: mcpRequest.id });
        const pokemon = await getPokemonData(pokemonName);
        if (!pokemon) return res.status(404).json({ jsonrpc: "2.0", error: { code: -32601, message: "Pokemon not found" }, id: mcpRequest.id });
        const allTypes = Object.keys(typeChart);
        const weaknesses: string[] = [];
        const resistances: string[] = [];
        const immunities: string[] = [];
        for (const attackingType of allTypes) {
          const multiplier = calculateTypeEffectiveness(attackingType, pokemon.types);
          if (multiplier > 1) weaknesses.push(attackingType);
          if (multiplier < 1 && multiplier > 0) resistances.push(attackingType);
          if (multiplier === 0) immunities.push(attackingType);
        }
        let text = `🛡️ **Type Defenses for ${pokemon.name.toUpperCase()}** (${pokemon.types.join(' / ')})\n\n`;
        text += `🔥 **Weak to (x2 or more):** ${weaknesses.join(', ') || 'None'}\n`;
        text += `🛡️ **Resists (x0.5 or less):** ${resistances.join(', ') || 'None'}\n`;
        text += `❌ **Immune to (x0):** ${immunities.join(', ') || 'None'}\n`;
        return res.json({ jsonrpc: "2.0", result: { content: [{ type: "text", text }] }, id: mcpRequest.id });
      }
      default:
        return res.status(404).json({ jsonrpc: "2.0", error: { code: -32601, message: `Tool '${name}' not found` }, id: mcpRequest.id });
    }
  } catch (error) {
    console.error("Tool call error:", error);
    res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: mcpRequest.id });
  }
});

app.listen(port, () => {
  console.log(`🚀 Advanced MCP Pokemon Server running at http://localhost:${port}`);
});
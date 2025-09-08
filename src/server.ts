// src/server.ts

import express, { Request, Response } from 'express';
import { getPokemonData } from './services/pokeapi.service';
import { handleBattleSimulator, handleListMoves } from './services/tool.handler';
import { Pokemon } from './pokemon.types';
import { config } from './config';

const app = express();
app.use(express.json());

interface MCPRequest { jsonrpc: "2.0"; method: string; params?: any; id: string | number; }

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
    response += `⚡ **Abilities:** ${pokemon.abilities.join(', ')}\n\n`;
    response += `🌀 **Evolution Chain:** ${pokemon.evolution.chain.join(' -> ')}\n`;
    return response;
}

// --- Main MCP Handler Function ---
async function handleMCPRequest(req: Request, res: Response) {
    const mcpRequest: MCPRequest = req.body;
    const { method, submethod } = req.params;
    const fullMethod = submethod ? `${method}.${submethod}` : method;

    try {
        switch (fullMethod) {
            case 'initialize':
                return res.json({ jsonrpc: "2.0", result: { protocolVersion: config.server.mcpVersion, serverInfo: { name: config.server.serverName, version: config.server.serverVersion } }, id: mcpRequest.id });

            case 'resources.list':
                return res.json({ jsonrpc: "2.0", result: { resources: [{ uri: "pokemon://data", name: "Pokemon Data Resource", description: "Access comprehensive data for any Pokemon." }] }, id: mcpRequest.id });

            case 'resources.read': {
                const { uri } = mcpRequest.params;
                const pokemonName = uri.split('/').pop();
                if (!pokemonName) return res.status(400).json({ jsonrpc: "2.0", error: { code: -32602, message: "Invalid URI" }, id: mcpRequest.id });

                const pokemonData = await getPokemonData(pokemonName);
                if (!pokemonData) return res.status(404).json({ jsonrpc: "2.0", error: { code: -32601, message: `Pokemon '${pokemonName}' not found.` }, id: mcpRequest.id });

                const text = formatPokemonDataForDisplay(pokemonData);
                return res.json({ jsonrpc: "2.0", result: { contents: [{ uri, mimeType: "text/plain", text }] }, id: mcpRequest.id });
            }

            case 'tools.list':
                const tools = [
                    { name: "battle_simulator", description: "Simulate a realistic battle between two Pokemon.", inputSchema: { type: "object", properties: { pokemon1: { type: "string" }, pokemon2: { type: "string" } }, required: ["pokemon1", "pokemon2"] } },
                    { name: "list_moves", description: "List the most relevant moves for a Pokemon.", inputSchema: { type: "object", properties: { name: { type: "string" }, limit: { type: "number" } }, required: ["name"] } }
                ];
                return res.json({ jsonrpc: "2.0", result: { tools }, id: mcpRequest.id });

            case 'tools.call': {
                const { name, arguments: toolArgs } = mcpRequest.params;
                let result;
                switch (name) {
                    case "battle_simulator":
                        result = await handleBattleSimulator(toolArgs);
                        break;
                    case "list_moves":
                        result = await handleListMoves(toolArgs);
                        break;
                    default:
                        return res.status(404).json({ jsonrpc: "2.0", error: { code: -32601, message: `Tool '${name}' not found.` }, id: mcpRequest.id });
                }
                
                if (result.error) {
                    return res.status(result.status || 500).json({ jsonrpc: "2.0", error: { code: -32603, message: result.error }, id: mcpRequest.id });
                }

                return res.json({ jsonrpc: "2.0", result: { content: [{ type: "text", text: result.text }] }, id: mcpRequest.id });
            }
            default:
                return res.status(404).json({ jsonrpc: "2.0", error: { code: -32601, message: `Method '${fullMethod}' not found.` }, id: mcpRequest.id });
        }
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: mcpRequest.id });
    }
}

// --- Register Routes ---
// Register two separate routes to handle both cases explicitly
app.post('/mcp/:method/:submethod', handleMCPRequest);
app.post('/mcp/:method', handleMCPRequest);


app.listen(config.server.port, () => {
  console.log(`🚀 Pro MCP Pokemon Server running at http://localhost:${config.server.port}`);
});
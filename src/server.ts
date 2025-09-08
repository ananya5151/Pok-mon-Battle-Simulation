// src/server.ts

import * as readline from 'readline';
import { getPokemonData } from './services/pokeapi.service';
import { handleBattleSimulator, handleListMoves } from './services/tool.handler';
import { Pokemon } from './pokemon.types';
import { config } from './config';

interface MCPRequest {
  jsonrpc: "2.0";
  method: string;
  params?: any;
  id: string | number;
}

function sendResponse(id: string | number, result: any, error: any = null) {
  const response = {
    jsonrpc: "2.0",
    id,
    ...(error ? { error } : { result }),
  };
  process.stdout.write(JSON.stringify(response) + '\n');
}

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

async function handleMCPRequest(mcpRequest: MCPRequest) {
  const { method, params, id } = mcpRequest;

  try {
    switch (method) {
      case 'initialize':
        return sendResponse(id, { protocolVersion: config.server.mcpVersion, serverInfo: { name: config.server.serverName, version: config.server.serverVersion } });
      case 'resources.read': {
        const { uri } = params;
        const pokemonName = uri.split('/').pop();
        if (!pokemonName) return sendResponse(id, null, { code: -32602, message: "Invalid URI" });
        const pokemonData = await getPokemonData(pokemonName);
        if (!pokemonData) return sendResponse(id, null, { code: -32601, message: `Pokemon '${pokemonName}' not found.` });
        const text = formatPokemonDataForDisplay(pokemonData);
        return sendResponse(id, { contents: [{ uri, mimeType: "text/plain", text }] });
      }
      case 'tools.call': {
        const { name, arguments: toolArgs } = params;
        let result;
        switch (name) {
          case "battle_simulator":
            result = await handleBattleSimulator(toolArgs);
            break;
          case "list_moves":
            result = await handleListMoves(toolArgs);
            break;
          default:
            return sendResponse(id, null, { code: -32601, message: `Tool '${name}' not found.` });
        }
        if (result.error) {
            return sendResponse(id, null, { code: -32603, message: result.error });
        }
        return sendResponse(id, { content: [{ type: "text", text: result.text }] });
      }
      default:
        return sendResponse(id, null, { code: -32601, message: `Method '${method}' not found.` });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    sendResponse(id, null, { code: -32603, message: errorMessage });
  }
}

function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  rl.on('line', (line) => {
    try {
      if (line.trim()) {
          const request = JSON.parse(line);
          handleMCPRequest(request);
      }
    } catch (e) {
      sendResponse('unknown', null, { code: -32700, message: 'Parse error' });
    }
  });
}

main();
"use strict";
// src/server.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const readline = __importStar(require("readline"));
const pokeapi_service_1 = require("./services/pokeapi.service");
const tool_handler_1 = require("./services/tool.handler");
const config_1 = require("./config");
function sendResponse(id, result, error = null) {
    const response = {
        jsonrpc: "2.0",
        id,
        ...(error ? { error } : { result }),
    };
    process.stdout.write(JSON.stringify(response) + '\n');
}
function formatPokemonDataForDisplay(pokemon) {
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
async function handleMCPRequest(mcpRequest) {
    const { method, params, id } = mcpRequest;
    try {
        switch (method) {
            case 'initialize':
                return sendResponse(id, { protocolVersion: config_1.config.server.mcpVersion, serverInfo: { name: config_1.config.server.serverName, version: config_1.config.server.serverVersion } });
            case 'resources.read': {
                const { uri } = params;
                const pokemonName = uri.split('/').pop();
                if (!pokemonName)
                    return sendResponse(id, null, { code: -32602, message: "Invalid URI" });
                const pokemonData = await (0, pokeapi_service_1.getPokemonData)(pokemonName);
                if (!pokemonData)
                    return sendResponse(id, null, { code: -32601, message: `Pokemon '${pokemonName}' not found.` });
                const text = formatPokemonDataForDisplay(pokemonData);
                return sendResponse(id, { contents: [{ uri, mimeType: "text/plain", text }] });
            }
            case 'tools.call': {
                const { name, arguments: toolArgs } = params;
                let result;
                switch (name) {
                    case "battle_simulator":
                        result = await (0, tool_handler_1.handleBattleSimulator)(toolArgs);
                        break;
                    case "list_moves":
                        result = await (0, tool_handler_1.handleListMoves)(toolArgs);
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
    }
    catch (error) {
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
        }
        catch (e) {
            sendResponse('unknown', null, { code: -32700, message: 'Parse error' });
        }
    });
}
main();

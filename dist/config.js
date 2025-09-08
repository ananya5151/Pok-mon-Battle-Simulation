"use strict";
// src/config.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.config = {
    server: {
        port: 3000,
        mcpVersion: "2024-11-05",
        serverName: "pokemon-battle-mcp-server-pro",
        serverVersion: "3.0.0"
    },
    api: {
        baseUrl: 'https://pokeapi.co/api/v2',
        moveFetchLimit: 20 // Fetches the top 20 moves from the API
    },
    battle: {
        defaultLevel: 50,
        maxTurns: 50,
        critChance: 1 / 24, // The official critical hit chance
        critMultiplier: 1.5,
        stabMultiplier: 1.5, // Same Type Attack Bonus
        randomFactor: {
            min: 0.85,
            max: 1.0
        }
    }
};

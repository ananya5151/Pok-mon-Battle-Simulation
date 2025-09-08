"use strict";
// src/services/tool.handler.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleBattleSimulator = handleBattleSimulator;
exports.handleListMoves = handleListMoves;
const pokeapi_service_1 = require("./pokeapi.service");
const battle_service_1 = require("../tool/battle.service");
async function handleBattleSimulator(args) {
    const { pokemon1, pokemon2 } = args;
    if (!pokemon1 || !pokemon2) {
        return { error: "Missing parameters: pokemon1 and pokemon2 are required.", status: 400 };
    }
    const [p1Data, p2Data] = await Promise.all([(0, pokeapi_service_1.getPokemonData)(pokemon1), (0, pokeapi_service_1.getPokemonData)(pokemon2)]);
    if (!p1Data) {
        return { error: `Pokemon '${pokemon1}' not found.`, status: 404 };
    }
    if (!p2Data) {
        return { error: `Pokemon '${pokemon2}' not found.`, status: 404 };
    }
    const simulator = new battle_service_1.BattleSimulator(p1Data, p2Data);
    const battleLog = simulator.run();
    return { text: battleLog.join('\n') };
}
async function handleListMoves(args) {
    const { name, limit = 10 } = args;
    if (!name) {
        return { error: "Missing parameter: name", status: 400 };
    }
    const data = await (0, pokeapi_service_1.getPokemonData)(name);
    if (!data) {
        return { error: `Pokemon '${name}' not found`, status: 404 };
    }
    const moveList = data.moves.slice(0, limit).map((m, i) => `${i + 1}. ${m.name.replace(/-/g, ' ')} (${m.category}, ${m.power || 'N/A'} power)`);
    const text = `🥊 ${data.name.toUpperCase()}'s Moves (Top ${limit}):\n` + moveList.join('\n');
    return { text };
}

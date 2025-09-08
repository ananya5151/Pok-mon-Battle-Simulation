// src/services/tool.handler.ts

import { getPokemonData } from './pokeapi.service';
import { BattleSimulator } from '../tool/battle.service';

export async function handleBattleSimulator(args: any) {
    const { pokemon1, pokemon2 } = args;
    if (!pokemon1 || !pokemon2) {
        return { error: "Missing parameters: pokemon1 and pokemon2 are required.", status: 400 };
    }

    const [p1Data, p2Data] = await Promise.all([getPokemonData(pokemon1), getPokemonData(pokemon2)]);
    if (!p1Data) {
        return { error: `Pokemon '${pokemon1}' not found.`, status: 404 };
    }
    if (!p2Data) {
        return { error: `Pokemon '${pokemon2}' not found.`, status: 404 };
    }

    const simulator = new BattleSimulator(p1Data, p2Data);
    const battleLog = simulator.run();
    return { text: battleLog.join('\n') };
}

export async function handleListMoves(args: any) {
    const { name, limit = 10 } = args;
    if (!name) {
        return { error: "Missing parameter: name", status: 400 };
    }
    
    const data = await getPokemonData(name);
    if (!data) {
        return { error: `Pokemon '${name}' not found`, status: 404 };
    }

    const moveList = data.moves.slice(0, limit).map((m, i) => 
        `${i + 1}. ${m.name.replace(/-/g, ' ')} (${m.category}, ${m.power || 'N/A'} power)`
    );
    const text = `🥊 ${data.name.toUpperCase()}'s Moves (Top ${limit}):\n` + moveList.join('\n');
    return { text };
}
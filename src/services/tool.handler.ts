// src/services/tool.handler.ts

import { getPokemonData } from './pokeapi.service';
import { BattleSimulator } from '../tool/battle.service';
import { Pokemon } from '../pokemon.types';

// This is the new, corrected function that now includes moves.
export async function handleGetPokemon(args: any) {
    const { name } = args;
    if (!name) {
        return { error: "Missing parameter: name", status: 400 };
    }
    
    const data = await getPokemonData(name);
    if (!data) {
        return { error: `Pokemon '${name}' not found`, status: 404 };
    }

    const totalStats = data.stats.hp + data.stats.attack + data.stats.defense + data.stats.specialAttack + data.stats.specialDefense + data.stats.speed;
    
    let response = `🌟 **${data.name.toUpperCase()}** (#${data.id})\n`;
    if (data.sprites.front_default) {
        response += `Image: ${data.sprites.front_default}\n`;
    }
    response += `\n🏷️ **Type:** ${data.types.join(' / ')}\n\n`;
    response += `📊 **Base Stats:**\n`;
    response += `   ❤️ HP: ${data.stats.hp}\n`;
    response += `   ⚔️ Attack: ${data.stats.attack}\n`;
    response += `   🛡️ Defense: ${data.stats.defense}\n`;
    response += `   🔮 Sp. Attack: ${data.stats.specialAttack}\n`;
    response += `   🛡️ Sp. Defense: ${data.stats.specialDefense}\n`;
    response += `   💨 Speed: ${data.stats.speed}\n`;
    response += `   📈 **Total: ${totalStats}**\n\n`;
    response += `⚡ **Abilities:** ${data.abilities.join(', ')}\n\n`;
    response += `🌀 **Evolution Chain:** ${data.evolution.chain.join(' -> ')}\n\n`;

    // **THIS IS THE NEWLY ADDED SECTION**
    if (data.moves.length > 0) {
        response += `🥊 **Notable Moves:**\n`;
        response += data.moves.slice(0, 8).map(move => 
            `   • ${move.name.replace(/-/g, ' ')} (${move.type})`
        ).join('\n');
    }
    
    return { text: response };
}

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

// NOTE: This function remains unchanged, but is included for completeness.
export async function handleGetTypeEffectiveness(args: any) {
    const { attacking_type, defending_types } = args;
    if (!attacking_type || !defending_types) {
        return { error: "Missing parameters: attacking_type and defending_types are required.", status: 400 };
    }

    // This logic should be moved to a dedicated service in a larger app,
    // but is kept here for simplicity to match the original structure.
    const typeEffectiveness: { [key: string]: { [key: string]: number } } = {
        "normal": { "rock": 0.5, "ghost": 0, "steel": 0.5 }, "fire": { "fire": 0.5, "water": 0.5, "grass": 2, "ice": 2, "bug": 2, "rock": 0.5, "dragon": 0.5, "steel": 2 },
        "water": { "fire": 2, "water": 0.5, "grass": 0.5, "ground": 2, "rock": 2, "dragon": 0.5 }, "electric": { "water": 2, "electric": 0.5, "grass": 0.5, "ground": 0, "flying": 2, "dragon": 0.5 },
        "grass": { "fire": 0.5, "water": 2, "grass": 0.5, "poison": 0.5, "ground": 2, "flying": 0.5, "bug": 0.5, "rock": 2, "dragon": 0.5, "steel": 0.5 },
        "ice": { "fire": 0.5, "water": 0.5, "grass": 2, "ice": 0.5, "ground": 2, "flying": 2, "dragon": 2, "steel": 0.5 },
        "fighting": { "normal": 2, "ice": 2, "poison": 0.5, "flying": 0.5, "psychic": 0.5, "bug": 0.5, "rock": 2, "ghost": 0, "dark": 2, "steel": 2, "fairy": 0.5 },
        "poison": { "grass": 2, "poison": 0.5, "ground": 0.5, "rock": 0.5, "ghost": 0.5, "steel": 0, "fairy": 2 }, "ground": { "fire": 2, "electric": 2, "grass": 0.5, "poison": 2, "flying": 0, "bug": 0.5, "rock": 2, "steel": 2 },
        "flying": { "electric": 0.5, "grass": 2, "fighting": 2, "bug": 2, "rock": 0.5, "steel": 0.5 }, "psychic": { "fighting": 2, "poison": 2, "psychic": 0.5, "dark": 0, "steel": 0.5, "ghost": 0 },
        "bug": { "fire": 0.5, "grass": 2, "fighting": 0.5, "poison": 0.5, "flying": 0.5, "psychic": 2, "ghost": 0.5, "dark": 2, "steel": 0.5, "fairy": 0.5 },
        "rock": { "fire": 2, "ice": 2, "fighting": 0.5, "ground": 0.5, "flying": 2, "bug": 2, "steel": 0.5 }, "ghost": { "normal": 0, "psychic": 2, "ghost": 2, "dark": 0.5 },
        "dragon": { "dragon": 2, "steel": 0.5, "fairy": 0 }, "dark": { "fighting": 0.5, "psychic": 2, "ghost": 2, "dark": 0.5, "fairy": 0.5 },
        "steel": { "fire": 0.5, "water": 0.5, "electric": 0.5, "ice": 2, "rock": 2, "steel": 0.5, "fairy": 2 }, "fairy": { "fire": 0.5, "fighting": 2, "poison": 0.5, "dragon": 2, "dark": 2, "steel": 0.5 }
    };

    let effectiveness = 1;
    defending_types.forEach((defenseType: string) => {
        effectiveness *= typeEffectiveness[attacking_type as keyof typeof typeEffectiveness]?.[defenseType] ?? 1;
    });

    let description = '';
    if (effectiveness > 2) description = "It's extremely effective!";
    else if (effectiveness > 1) description = "It's super effective!";
    else if (effectiveness < 1 && effectiveness > 0) description = "It's not very effective...";
    else if (effectiveness === 0) description = "It has no effect!";
    else description = "Normal effectiveness.";

    const text = `
    - **Attacking Type:** ${attacking_type}
    - **Defending Type(s):** ${defending_types.join(' / ')}
    - **Effectiveness Multiplier:** x${effectiveness}
    - **Result:** ${description}
    `;
    
    return { text };
}
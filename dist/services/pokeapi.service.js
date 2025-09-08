"use strict";
// src/services/pokeapi.service.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPokemonData = getPokemonData;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
const pokemonCache = new Map();
// This function now extracts status effect details from the API response.
async function getMoveData(moveUrl) {
    try {
        const response = await axios_1.default.get(moveUrl);
        const moveData = response.data;
        // Extract status effect and its chance from the complex API object
        let effect = undefined;
        let chance = undefined;
        if (moveData.meta?.ailment?.name && moveData.meta?.ailment_chance > 0) {
            const ailmentName = moveData.meta.ailment.name;
            if (['paralysis', 'burn', 'poison', 'sleep', 'freeze'].includes(ailmentName)) {
                effect = ailmentName;
                chance = moveData.meta.ailment_chance / 100; // Convert percentage to decimal
            }
        }
        return {
            name: moveData.name,
            power: moveData.power,
            type: moveData.type.name,
            accuracy: moveData.accuracy,
            category: moveData.damage_class.name,
            effect,
            chance,
        };
    }
    catch (error) {
        // It's better to log the specific URL that failed.
        console.error(`Failed to fetch move data from ${moveUrl}:`, error);
        return null;
    }
}
async function getPokemonData(name) {
    const identifier = name ? name.toLowerCase().trim() : '';
    if (!identifier) {
        console.error("getPokemonData called with an invalid name.");
        return null;
    }
    if (pokemonCache.has(identifier)) {
        return pokemonCache.get(identifier);
    }
    try {
        const response = await axios_1.default.get(`${config_1.config.api.baseUrl}/pokemon/${identifier}`);
        const apiData = response.data;
        const speciesResp = await axios_1.default.get(apiData.species.url);
        const species = speciesResp.data;
        const evoChainUrl = species.evolution_chain?.url;
        let evolution = { evolvesFrom: null, evolvesTo: [], chain: [] };
        if (evoChainUrl) {
            const evoResp = await axios_1.default.get(evoChainUrl);
            const evoData = evoResp.data;
            const chainNames = [];
            const nextMap = new Map();
            const traverse = (node) => {
                if (!node)
                    return;
                const speciesName = node.species?.name;
                if (speciesName)
                    chainNames.push(speciesName);
                const children = node.evolves_to || [];
                if (speciesName)
                    nextMap.set(speciesName, children.map((c) => c.species?.name).filter(Boolean));
                children.forEach(traverse);
            };
            traverse(evoData.chain);
            const thisName = apiData.name;
            const evolvesFrom = species.evolves_from_species?.name ?? null;
            const evolvesTo = nextMap.get(thisName) ?? [];
            evolution = { evolvesFrom, evolvesTo, chain: chainNames };
        }
        const movePromises = apiData.moves.slice(0, config_1.config.api.moveFetchLimit).map((m) => getMoveData(m.move.url));
        const moves = (await Promise.all(movePromises)).filter((m) => m !== null);
        const pokemon = {
            id: apiData.id,
            name: apiData.name,
            stats: {
                hp: apiData.stats.find((s) => s.stat.name === 'hp').base_stat,
                attack: apiData.stats.find((s) => s.stat.name === 'attack').base_stat,
                defense: apiData.stats.find((s) => s.stat.name === 'defense').base_stat,
                specialAttack: apiData.stats.find((s) => s.stat.name === 'special-attack').base_stat,
                specialDefense: apiData.stats.find((s) => s.stat.name === 'special-defense').base_stat,
                speed: apiData.stats.find((s) => s.stat.name === 'speed').base_stat,
            },
            types: apiData.types.map((t) => t.type.name),
            abilities: apiData.abilities.map((a) => a.ability.name.replace(/-/g, ' ')),
            moves,
            evolution,
            sprites: {
                front_default: apiData.sprites.front_default,
            }
        };
        pokemonCache.set(identifier, pokemon);
        return pokemon;
    }
    catch (error) {
        // Log a more helpful error message.
        console.error(`Error fetching Pokémon data for "${name}". It may not exist.`);
        return null;
    }
}

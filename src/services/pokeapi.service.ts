// src/services/pokeapi.service.ts

import axios from 'axios';
import { Pokemon, EvolutionInfo, Move, StatusEffectName } from '../pokemon.types';
import { config } from '../config';

const pokemonCache = new Map<string, Pokemon>();

// This function now extracts status effect details from the API response.
async function getMoveData(moveUrl: string): Promise<Move | null> {
    try {
        const response = await axios.get(moveUrl);
        const moveData = response.data;

        // Extract status effect and its chance from the complex API object
        let effect: StatusEffectName | undefined = undefined;
        let chance: number | undefined = undefined;

        if (moveData.meta?.ailment?.name && moveData.meta?.ailment_chance > 0) {
            const ailmentName = moveData.meta.ailment.name;
            if (['paralysis', 'burn', 'poison', 'sleep', 'freeze'].includes(ailmentName)) {
                effect = ailmentName as StatusEffectName;
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
    } catch (error) {
        // It's better to log the specific URL that failed.
        console.error(`Failed to fetch move data from ${moveUrl}:`, error);
        return null;
    }
}

export async function getPokemonData(name: string): Promise<Pokemon | null> {
  const identifier = name ? name.toLowerCase().trim() : '';

  if (!identifier) {
      console.error("getPokemonData called with an invalid name.");
      return null;
  }
  
  if (pokemonCache.has(identifier)) {
    return pokemonCache.get(identifier)!;
  }

  try {
    const response = await axios.get(`${config.api.baseUrl}/pokemon/${identifier}`);
    const apiData = response.data;

    const speciesResp = await axios.get(apiData.species.url);
    const species = speciesResp.data;

    const evoChainUrl: string = species.evolution_chain?.url;
    let evolution: EvolutionInfo = { evolvesFrom: null, evolvesTo: [], chain: [] };
    if (evoChainUrl) {
      const evoResp = await axios.get(evoChainUrl);
      const evoData = evoResp.data;
      const chainNames: string[] = [];
      const nextMap = new Map<string, string[]>();
      const traverse = (node: any) => {
        if (!node) return;
        const speciesName: string = node.species?.name;
        if (speciesName) chainNames.push(speciesName);
        const children: any[] = node.evolves_to || [];
        if (speciesName) nextMap.set(speciesName, children.map((c: any) => c.species?.name).filter(Boolean));
        children.forEach(traverse);
      };
      traverse(evoData.chain);
      const thisName = apiData.name;
      const evolvesFrom: string | null = species.evolves_from_species?.name ?? null;
      const evolvesTo: string[] = nextMap.get(thisName) ?? [];
      evolution = { evolvesFrom, evolvesTo, chain: chainNames };
    }
    
    const movePromises = apiData.moves.slice(0, config.api.moveFetchLimit).map((m: any) => getMoveData(m.move.url));
    const moves = (await Promise.all(movePromises)).filter((m): m is Move => m !== null);

    const pokemon: Pokemon = {
      id: apiData.id,
      name: apiData.name,
      stats: {
        hp: apiData.stats.find((s: any) => s.stat.name === 'hp').base_stat,
        attack: apiData.stats.find((s: any) => s.stat.name === 'attack').base_stat,
        defense: apiData.stats.find((s: any) => s.stat.name === 'defense').base_stat,
        specialAttack: apiData.stats.find((s: any) => s.stat.name === 'special-attack').base_stat,
        specialDefense: apiData.stats.find((s: any) => s.stat.name === 'special-defense').base_stat,
        speed: apiData.stats.find((s: any) => s.stat.name === 'speed').base_stat,
      },
      types: apiData.types.map((t: any) => t.type.name),
      abilities: apiData.abilities.map((a: any) => a.ability.name.replace(/-/g, ' ')),
      moves,
      evolution,
      sprites: {
        front_default: apiData.sprites.front_default,
      }
    };

    pokemonCache.set(identifier, pokemon);
    return pokemon;
  } catch (error) {
    // Log a more helpful error message.
    console.error(`Error fetching Pokémon data for "${name}". It may not exist.`);
    return null;
  }
}
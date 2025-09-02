// src/services/pokeapi.service.ts

import axios from 'axios';
import { Pokemon, EvolutionInfo } from '../pokemon.types';

// The base URL for the PokéAPI
const API_BASE_URL = 'https://pokeapi.co/api/v2';

/**
 * Fetches detailed data for a specific Pokémon from the PokéAPI
 * and transforms it into our simplified Pokemon interface.
 * @param name - The name or ID of the Pokémon to fetch.
 * @returns A Promise that resolves to a Pokemon object or null if not found.
 */
export async function getPokemonData(name: string): Promise<Pokemon | null> {
  try {
    // Fetch the raw data from the API. We convert the name to lowercase
    // because the API is case-sensitive.
    const response = await axios.get(`${API_BASE_URL}/pokemon/${name.toLowerCase()}`);
    const apiData = response.data;

    // Transform the complex API data into our simple Pokemon structure.
    // Fetch species for evolution details
    const speciesResp = await axios.get(apiData.species.url);
    const species = speciesResp.data;

    // Fetch evolution chain and parse it
    const evoChainUrl: string = species.evolution_chain?.url;
    let evolution: EvolutionInfo = { evolvesFrom: null, evolvesTo: [], chain: [] };
    if (evoChainUrl) {
      const evoResp = await axios.get(evoChainUrl);
      const evoData = evoResp.data;

      // Helper to traverse evolution chain
      const chainNames: string[] = [];
      const nextMap = new Map<string, string[]>();
      const traverse = (node: any) => {
        if (!node) {
          return;
        }
        const speciesName: string = node.species?.name;
        if (speciesName) {
          chainNames.push(speciesName);
        }
        const children: any[] = node.evolves_to || [];
        if (speciesName) {
          nextMap.set(speciesName, children.map((c: any) => c.species?.name).filter(Boolean));
        }
        children.forEach(traverse);
      };
      traverse(evoData.chain);

      const thisName = apiData.name;
      const evolvesFrom: string | null = species.evolves_from_species?.name ?? null;
      const evolvesTo: string[] = nextMap.get(thisName) ?? [];
      evolution = { evolvesFrom, evolvesTo, chain: chainNames };
    }

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
      abilities: apiData.abilities.map((a: any) => a.ability.name),
      moves: apiData.moves.map((m: any) => m.move.name),
      evolution,
    };

    return pokemon;
  } catch (error) {
    // If the Pokémon is not found, the API returns a 404 error.
    // We'll log the error and return null to indicate it wasn't found.
    console.error(`Error fetching data for ${name}:`, error);
    return null;
  }
}
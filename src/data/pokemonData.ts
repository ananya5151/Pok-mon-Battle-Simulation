import axios from 'axios';
import { Pokemon, PokemonType, Move, Ability } from '../types/pokemon';
import * as fs from 'fs';
import * as path from 'path';

const CACHE_PATH = path.join(process.cwd(), 'data', 'pokemon-data-cache.json');

export class PokemonDataService {
    private cache: Map<string, Pokemon> = new Map();
    private baseUrl = 'https://pokeapi.co/api/v2';

    constructor() {
        this.loadCache();
    }

    private loadCache() {
        try {
            if (fs.existsSync(CACHE_PATH)) {
                const raw = fs.readFileSync(CACHE_PATH, 'utf-8');
                const arr: Pokemon[] = JSON.parse(raw);
                for (const p of arr) {
                    this.cache.set(p.name.toLowerCase(), p);
                    this.cache.set(String(p.id), p);
                }
            }
        } catch {
            // ignore
        }
    }

    private saveCache() {
        try {
            const all = Array.from(new Set(Array.from(this.cache.values())));
            fs.writeFileSync(CACHE_PATH, JSON.stringify(all, null, 2), 'utf-8');
        } catch {
            // ignore
        }
    }

    async getPokemon(nameOrId: string | number): Promise<Pokemon> {
        const key = nameOrId.toString().toLowerCase();
        const cached = this.cache.get(key);
        if (cached) {
            return cached;
        }

        const pokemon = await this.fetchPokemonFromAPI(nameOrId);
        this.cache.set(pokemon.name.toLowerCase(), pokemon);
        this.cache.set(String(pokemon.id), pokemon);
        this.saveCache();
        return pokemon;
    }

    private async fetchPokemonFromAPI(nameOrId: string | number): Promise<Pokemon> {
        const { data } = await axios.get(`${this.baseUrl}/pokemon/${nameOrId}`);

        const types: PokemonType[] = data.types.map((t: any) => t.type.name);

        // Fetch real move details and pick strong, reliable moves
        const moveEntries: any[] = data.moves.slice(0, 60); // take more entries for richer selection
        const detailed: Move[] = [];
        for (const entry of moveEntries) {
            try {
                const mv = await axios.get(entry.move.url);
                const md = mv.data;
                // Skip status-only moves for now (we still include if power is null and category is 'status')
                const name: string = md.name;
                const power: number | undefined = md.power ?? undefined;
                const accuracy: number = md.accuracy ?? 100;
                const pp: number = md.pp ?? 20;
                const category: 'physical' | 'special' | 'status' = md.damage_class?.name ?? 'status';
                const mtype: PokemonType = md.type?.name ?? types[0];
                // Attempt to derive simple status effect chances from meta
                // PokeAPI move effects contain effect_entries and meta fields; we'll map a few common ones
                let effects: any[] | undefined;
                const ailment = md.meta?.ailment?.name;
                const ailmentChance = md.meta?.ailment_chance;
                if (ailment && ailment !== 'none' && typeof ailmentChance === 'number' && ailmentChance > 0) {
                    const map: Record<string, string> = { burn: 'burn', poison: 'poison', paralysis: 'paralysis', sleep: 'sleep', freeze: 'freeze', confusion: 'confusion', flinch: 'flinch' };
                    const status = map[ailment];
                    if (status) {
                        effects = [{ type: 'status', chance: ailmentChance, status }];
                    }
                }
                detailed.push({ name, power, accuracy, pp, category, type: mtype, effects });
            } catch {
                // ignore individual move errors
            }
        }
        // Sort by effective power (favor higher power/accuracy)
        detailed.sort((a, b) => ((b.power ?? 0) * (b.accuracy ?? 100)) - ((a.power ?? 0) * (a.accuracy ?? 100)));
        const moves: Move[] = detailed.slice(0, 12); // keep top dozen for listing; battle will still use 4

        const abilities: Ability[] = data.abilities.map((a: any) => ({
            name: a.ability.name,
            description: a.ability.name,
            isHidden: a.is_hidden,
        }));
        // Fetch evolution info via species -> evolution chain
        let evolution: { evolvesTo?: string; level?: number } | undefined;
        try {
            const speciesResp = await axios.get(`${this.baseUrl}/pokemon-species/${data.id}`);
            const evoChainUrl: string | undefined = speciesResp.data?.evolution_chain?.url;
            if (evoChainUrl) {
                const evoResp = await axios.get(evoChainUrl);
                const chain = evoResp.data?.chain;
                // Walk the chain to find the current species, then take the first evolves_to as the next evolution
                const findNode = (node: any, targetName: string): any | undefined => {
                    if (!node) {
                        return undefined;
                    }
                    if (node.species?.name?.toLowerCase() === targetName.toLowerCase()) {
                        return node;
                    }
                    for (const child of node.evolves_to || []) {
                        const found = findNode(child, targetName);
                        if (found) {
                            return found;
                        }
                    }
                    return undefined;
                };
                const node = findNode(chain, data.species.name);
                const next = node?.evolves_to?.[0];
                if (next?.species?.name) {
                    const evoDetails = next.evolution_details?.[0];
                    const minLevel = evoDetails?.min_level as number | undefined;
                    evolution = { evolvesTo: next.species.name, level: minLevel };
                }
            }
        } catch {
            // ignore evolution errors
        }

        const pokemon: Pokemon = {
            id: data.id,
            name: data.name,
            types,
            baseStats: {
                hp: data.stats.find((s: any) => s.stat.name === 'hp')?.base_stat || 50,
                attack: data.stats.find((s: any) => s.stat.name === 'attack')?.base_stat || 50,
                defense: data.stats.find((s: any) => s.stat.name === 'defense')?.base_stat || 50,
                specialAttack: data.stats.find((s: any) => s.stat.name === 'special-attack')?.base_stat || 50,
                specialDefense: data.stats.find((s: any) => s.stat.name === 'special-defense')?.base_stat || 50,
                speed: data.stats.find((s: any) => s.stat.name === 'speed')?.base_stat || 50,
            },
            abilities,
            moves,
            evolution,
            height: data.height,
            weight: data.weight,
            species: data.species.name,
        };

        return pokemon;
    }

    async getAllPokemon(limit = 151): Promise<Pokemon[]> {
        const { data } = await axios.get(`${this.baseUrl}/pokemon?limit=${limit}`);
        const names: string[] = data.results.map((r: any) => r.name);
        const list: Pokemon[] = [];
        for (const n of names) {
            list.push(await this.getPokemon(n));
        }
        return list;
    }
}

// src/pokemon.types.ts

export interface Pokemon {
  id: number;
  name: string;
  stats: {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  };
  types: string[];
  abilities: string[];
  moves: string[];
  evolution: EvolutionInfo;
}

export interface EvolutionInfo {
  /** Immediate pre-evolution species name, if any */
  evolvesFrom: string | null;
  /** Immediate next evolutions' species names (could be multiple branches) */
  evolvesTo: string[];
  /** All species in the full evolution chain (flattened, order by traversal) */
  chain: string[];
}
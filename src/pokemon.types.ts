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
  sprites: {
    front_default: string | null;
  };
}

export interface EvolutionInfo {
  evolvesFrom: string | null;
  evolvesTo: string[];
  chain: string[];
}

export type StatusEffect = 'paralysis' | 'burn' | 'poison' | 'sleep' | 'freeze' | null;

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
  moves: Move[];
  evolution: EvolutionInfo;
  sprites: {
    front_default: string | null;
  };
}

export interface Move {
    name: string;
    power: number | null;
    type: string;
    accuracy: number | null;
    category: 'physical' | 'special' | 'status';
    effect?: StatusEffect;
    chance?: number;
}

export interface EvolutionInfo {
  evolvesFrom: string | null;
  evolvesTo: string[];
  chain: string[];
}

export type StatusEffect = 'paralysis' | 'burn' | 'poison' | 'sleep' | 'freeze' | null;
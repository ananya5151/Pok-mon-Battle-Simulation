export interface Pokemon {
    id: number;
    name: string;
    types: PokemonType[];
    baseStats: BaseStats;
    abilities: Ability[];
    moves: Move[];
    evolution?: Evolution;
    height: number;
    weight: number;
    species: string;
}

export interface BaseStats {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
}

export enum PokemonType {
    NORMAL = 'normal',
    FIRE = 'fire',
    WATER = 'water',
    ELECTRIC = 'electric',
    GRASS = 'grass',
    ICE = 'ice',
    FIGHTING = 'fighting',
    POISON = 'poison',
    GROUND = 'ground',
    FLYING = 'flying',
    PSYCHIC = 'psychic',
    BUG = 'bug',
    ROCK = 'rock',
    GHOST = 'ghost',
    DRAGON = 'dragon',
    DARK = 'dark',
    STEEL = 'steel',
    FAIRY = 'fairy',
}

export interface MoveEffect {
    type: 'status' | 'stat-change' | 'other';
    chance?: number;
    status?: StatusName;
}

export type StatusName = 'burn' | 'poison' | 'paralysis' | 'sleep' | 'freeze' | 'confusion' | 'flinch';

export interface Move {
    name: string;
    type: PokemonType;
    category: 'physical' | 'special' | 'status';
    power?: number;
    accuracy: number; // 0-100
    pp: number;
    effects?: MoveEffect[];
}

export interface Ability {
    name: string;
    description: string;
    isHidden: boolean;
}

export interface Evolution {
    evolvesTo?: string;
    level?: number;
}

import { Move, Pokemon } from './pokemon';

export interface BattlePokemon {
    pokemon: Pokemon;
    currentHp: number;
    statusEffects: StatusEffect[];
    statModifiers: StatModifiers;
    selectedMoves: Move[];
    movePP?: Record<string, number>;
    effectiveStats?: {
        hp: number;
        attack: number;
        defense: number;
        specialAttack: number;
        specialDefense: number;
        speed: number;
    };
    // Volatile states for turn-by-turn effects
    flinched?: boolean;
    counters?: {
        sleep?: number;
        confusion?: number;
    };
}

export interface StatModifiers {
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
    accuracy: number;
    evasion: number;
}

export interface BattleAction {
    actor: string;
    move?: string;
    text: string;
}

export interface BattleLog {
    turn: number;
    actions: BattleAction[];
    result?: BattleResult;
    hp?: {
        [name: string]: { hp: number; max: number };
    };
}

export enum StatusEffect {
    BURN = 'burn',
    POISON = 'poison',
    PARALYSIS = 'paralysis',
    SLEEP = 'sleep',
    FREEZE = 'freeze',
    CONFUSION = 'confusion',
}

export interface BattleResult {
    winner: string;
    battleLog: BattleLog[];
    turns: number;
    seed?: string | number;
}

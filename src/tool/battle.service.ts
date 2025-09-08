// src/tool/battle.service.ts

import { Pokemon } from '../pokemon.types';

type TypeChart = {
  [key: string]: { [key: string]: number }
};

// NEW: Define the structure for a move, now including optional status effects.
interface Move {
  power: number;
  type: string;
  effect?: 'paralysis' | 'burn' | 'poison';
  chance?: number;
}

// A simplified map for type effectiveness.
const typeEffectiveness: TypeChart = {
  normal: { rock: 0.5, ghost: 0 },
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, steel: 2 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  ghost: { normal: 0, psychic: 2, ghost: 2 },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0 },
};

// NEW: Updated move data with status-effecting moves.
const moveData: { [key: string]: Move } = {
  'tackle': { power: 40, type: 'normal' },
  'ember': { power: 40, type: 'fire' },
  'fire-punch': { power: 75, type: 'fire' },
  'flamethrower': { power: 90, type: 'fire' },
  'water-gun': { power: 40, type: 'water' },
  'bubble-beam': { power: 65, type: 'water' },
  'thunder-shock': { power: 40, type: 'electric' },
  'thunderbolt': { power: 90, type: 'electric' },
  'wing-attack': { power: 60, type: 'flying' },
  'quick-attack': { power: 40, type: 'normal' },
  'toxic': { power: 0, type: 'poison', effect: 'poison', chance: 0.9 },
  'thunder-wave': { power: 0, type: 'electric', effect: 'paralysis', chance: 0.9 },
  'will-o-wisp': { power: 0, type: 'fire', effect: 'burn', chance: 0.85 },
};

// NEW: Define a type for our battling Pokémon to include HP and status.
type BattlingPokemon = Pokemon & {
  currentHp: number;
  status: 'paralysis' | 'burn' | 'poison' | null;
};

/**
 * Simulates a battle between two Pokémon.
 * @param pokemon1 - The first Pokémon object.
 * @param pokemon2 - The second Pokémon object.
 * @returns A detailed log of the battle.
 */
export function simulateBattle(pokemon1: Pokemon, pokemon2: Pokemon): string[] {
  const battleLog: string[] = [];

  // NEW: Clones now include a 'status' property, initialized to null.
  let p1: BattlingPokemon = { ...pokemon1, currentHp: pokemon1.stats.hp, status: null };
  let p2: BattlingPokemon = { ...pokemon2, currentHp: pokemon2.stats.hp, status: null };

  // 1. Pre-Battle Summary
  battleLog.push("========================================");
  battleLog.push(`⚔️ BATTLE: ${p1.name.toUpperCase()} vs ${p2.name.toUpperCase()} ⚔️`);
  battleLog.push("========================================");
  if (p1.stats.speed > p2.stats.speed) {
    battleLog.push(`⚡ Speed Advantage: ${p1.name} will attack first!`);
  } else {
    battleLog.push(`⚡ Speed Advantage: ${p2.name} will attack first!`);
  }
  battleLog.push("\n--- BATTLE BEGINS! ---\n");

  let turn = 1;
  while (p1.currentHp > 0 && p2.currentHp > 0) {
    battleLog.push(`--- Turn ${turn} ---`);

    const [attacker, defender] = p1.stats.speed >= p2.stats.speed ? [p1, p2] : [p2, p1];

    // --- First Pokémon's turn ---
    if (attacker.currentHp > 0) {
      performTurn(attacker, defender, battleLog);
    }

    // --- Second Pokémon's turn (if it hasn't fainted) ---
    if (defender.currentHp > 0) {
      performTurn(defender, attacker, battleLog);
    }

    turn++;
    if (turn > 100) break; // Prevent infinite loops
  }

  const winner = p1.currentHp > 0 ? p1 : p2;
  const loser = winner === p1 ? p2 : p1;
  battleLog.push(`${loser.name} has fainted!`);
  battleLog.push(`\n--- ${winner.name.toUpperCase()} WINS THE BATTLE! ---`);
  battleLog.push("\n========================================");
  battleLog.push("🧠 STRATEGIC ANALYSIS");
  battleLog.push("========================================");
  if (winner.stats.speed > loser.stats.speed) {
      battleLog.push(`• The winner's higher speed was a key factor, allowing it to control the pace of the battle.`);
  }
  battleLog.push(`• The winner's strategic use of its moves and type advantages secured the victory.`);

  return battleLog;
}

// NEW: A dedicated function to handle a single Pokémon's turn.
function performTurn(attacker: BattlingPokemon, defender: BattlingPokemon, battleLog: string[]) {
  // --- Check for status effects before attacking ---
  if (attacker.status === 'paralysis') {
    if (Math.random() < 0.25) { // 25% chance to be fully paralyzed
      battleLog.push(`${attacker.name} is fully paralyzed and can't move!`);
      return; // Skip the rest of the turn
    }
  }

  // Intelligent move selection
  const { moveName, move } = selectMove(attacker, defender);

  battleLog.push(`${attacker.name} used ${moveName}!`);

  // Handle damage-dealing moves
  if (move.power > 0) {
    const damage = calculateDamage(attacker, defender, move);
    defender.currentHp -= damage;
    if (defender.currentHp < 0) defender.currentHp = 0;
    battleLog.push(`It dealt ${damage.toFixed(0)} damage to ${defender.name}.`);
  }

  // Handle status-effecting moves
  if (move.effect && defender.status === null && move.chance && Math.random() < move.chance) {
    defender.status = move.effect;
    battleLog.push(`${defender.name} is now ${move.effect}ed!`);
  }

  battleLog.push(`${defender.name} has ${defender.currentHp.toFixed(0)} HP left.`);

  // --- Apply status damage at the end of the turn ---
  if (attacker.status === 'burn' || attacker.status === 'poison') {
    const statusDamage = Math.floor(attacker.stats.hp / 16);
    attacker.currentHp -= statusDamage;
    if (attacker.currentHp < 0) attacker.currentHp = 0;
    battleLog.push(`${attacker.name} is hurt by its ${attacker.status}! It lost ${statusDamage} HP.`);
    battleLog.push(`${attacker.name} has ${attacker.currentHp.toFixed(0)} HP left.`);
  }
}

/**
 * Calculates the damage one Pokémon does to another with a specific move.
 */
function calculateDamage(attacker: BattlingPokemon, defender: BattlingPokemon, move: Move): number {
  const LEVEL = 50; // Standard competitive level
  let attack = attacker.stats.attack;

  if (attacker.status === 'burn') {
    attack /= 2;
  }

  const defense = defender.stats.defense;

  // --- Start of New Formula ---
  let damage = (((2 * LEVEL / 5 + 2) * move.power * (attack / defense)) / 50) + 2;

  // 1. Add STAB (Same Type Attack Bonus)
  if (attacker.types.includes(move.type)) {
    damage *= 1.5;
  }

  // 2. Type Effectiveness (Your existing logic is good)
  let effectiveness = 1;
  const attackType = move.type;
  if (typeEffectiveness[attackType]) {
    defender.types.forEach(defenseType => {
      if (typeEffectiveness[attackType][defenseType] !== undefined) {
        effectiveness *= typeEffectiveness[attackType][defenseType];
      }
    });
  }
  damage *= effectiveness;

  // 3. Add Random Variance (85% to 100%)
  const randomFactor = Math.random() * (1.0 - 0.85) + 0.85;
  damage *= randomFactor;
  // --- End of New Formula ---

  // Return final damage, ensuring it's at least 1
  return Math.max(1, Math.floor(damage));
}

// Intelligent move selection prioritizing effectiveness and power
function selectMove(attacker: BattlingPokemon, defender: BattlingPokemon): { moveName: string; move: Move } {
  const availableMoves = attacker.moves
    .map(name => ({ name, data: moveData[name] }))
    .filter(m => m.data && m.data.power > 0); // Only consider damaging moves

  if (availableMoves.length === 0) {
    // Fallback if no damaging moves are known
    return { moveName: 'tackle', move: moveData['tackle'] };
  }

  let bestMove = availableMoves[0];
  let maxScore = 0;

  for (const potentialMove of availableMoves) {
    let effectiveness = 1;
    const attackType = potentialMove.data.type;
    defender.types.forEach(defenseType => {
      if (typeEffectiveness[attackType]?.[defenseType] !== undefined) {
        effectiveness *= typeEffectiveness[attackType][defenseType];
      }
    });

    // Score is based on effectiveness first, then power
    const moveScore = (potentialMove.data.power || 0) * effectiveness;

    if (moveScore > maxScore) {
      maxScore = moveScore;
      bestMove = { name: potentialMove.name, data: potentialMove.data } as any;
    }
  }
  return { moveName: (bestMove as any).name, move: (bestMove as any).data };
}
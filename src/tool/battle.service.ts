// src/tool/battle.service.ts

import { Pokemon, StatusEffect } from '../pokemon.types';

type TypeChart = { [key: string]: { [key: string]: number } };

interface Move {
  power: number;
  type: string;
  effect?: StatusEffect;
  chance?: number;
}

const typeEffectiveness: TypeChart = {
    "normal": { "rock": 0.5, "ghost": 0, "steel": 0.5 }, "fire": { "fire": 0.5, "water": 0.5, "grass": 2, "ice": 2, "bug": 2, "rock": 0.5, "dragon": 0.5, "steel": 2 },
    "water": { "fire": 2, "water": 0.5, "grass": 0.5, "ground": 2, "rock": 2, "dragon": 0.5 }, "electric": { "water": 2, "electric": 0.5, "grass": 0.5, "ground": 0, "flying": 2, "dragon": 0.5 },
    "grass": { "fire": 0.5, "water": 2, "grass": 0.5, "poison": 0.5, "ground": 2, "flying": 0.5, "bug": 0.5, "rock": 2, "dragon": 0.5, "steel": 0.5 },
    "ice": { "fire": 0.5, "water": 0.5, "grass": 2, "ice": 0.5, "ground": 2, "flying": 2, "dragon": 2, "steel": 0.5 },
    "fighting": { "normal": 2, "ice": 2, "poison": 0.5, "flying": 0.5, "psychic": 0.5, "bug": 0.5, "rock": 2, "ghost": 0, "dark": 2, "steel": 2, "fairy": 0.5 },
    "poison": { "grass": 2, "poison": 0.5, "ground": 0.5, "rock": 0.5, "ghost": 0.5, "steel": 0, "fairy": 2 }, "ground": { "fire": 2, "electric": 2, "grass": 0.5, "poison": 2, "flying": 0, "bug": 0.5, "rock": 2, "steel": 2 },
    "flying": { "electric": 0.5, "grass": 2, "fighting": 2, "bug": 2, "rock": 0.5, "steel": 0.5 }, "psychic": { "fighting": 2, "poison": 2, "psychic": 0.5, "dark": 0, "steel": 0.5 },
    "bug": { "fire": 0.5, "grass": 2, "fighting": 0.5, "poison": 0.5, "flying": 0.5, "psychic": 2, "ghost": 0.5, "dark": 2, "steel": 0.5, "fairy": 0.5 },
    "rock": { "fire": 2, "ice": 2, "fighting": 0.5, "ground": 0.5, "flying": 2, "bug": 2, "steel": 0.5 }, "ghost": { "normal": 0, "psychic": 2, "ghost": 2, "dark": 0.5 },
    "dragon": { "dragon": 2, "steel": 0.5, "fairy": 0 }, "dark": { "fighting": 0.5, "psychic": 2, "ghost": 2, "dark": 0.5, "fairy": 0.5 },
    "steel": { "fire": 0.5, "water": 0.5, "electric": 0.5, "ice": 2, "rock": 2, "steel": 0.5, "fairy": 2 }, "fairy": { "fire": 0.5, "fighting": 2, "poison": 0.5, "dragon": 2, "dark": 2, "steel": 0.5 }
};

const moveData: { [key: string]: Move } = {
    'tackle': { power: 40, type: 'normal' }, 'ember': { power: 40, type: 'fire', effect: 'burn', chance: 0.1 },
    'fire-punch': { power: 75, type: 'fire', effect: 'burn', chance: 0.1 }, 'flamethrower': { power: 90, type: 'fire', effect: 'burn', chance: 0.1 },
    'water-gun': { power: 40, type: 'water' }, 'bubble-beam': { power: 65, type: 'water' },
    'thunder-shock': { power: 40, type: 'electric', effect: 'paralysis', chance: 0.1 }, 'thunderbolt': { power: 90, type: 'electric', effect: 'paralysis', chance: 0.1 },
    'ice-beam': { power: 90, type: 'ice', effect: 'freeze', chance: 0.1 }, 'blizzard': { power: 110, type: 'ice', effect: 'freeze', chance: 0.1 },
    'wing-attack': { power: 60, type: 'flying' }, 'quick-attack': { power: 40, type: 'normal' },
    'toxic': { power: 0, type: 'poison', effect: 'poison', chance: 0.9 }, 'thunder-wave': { power: 0, type: 'electric', effect: 'paralysis', chance: 0.9 },
    'will-o-wisp': { power: 0, type: 'fire', effect: 'burn', chance: 0.85 }, 'spore': { power: 0, type: 'grass', effect: 'sleep', chance: 1.0 }
};

type BattlingPokemon = Pokemon & {
  currentHp: number;
  status: StatusEffect;
  statusTurns: number;
};

export function simulateBattle(pokemon1: Pokemon, pokemon2: Pokemon): string[] {
  const battleLog: string[] = [];
  let p1: BattlingPokemon = { ...pokemon1, currentHp: pokemon1.stats.hp, status: null, statusTurns: 0 };
  let p2: BattlingPokemon = { ...pokemon2, currentHp: pokemon2.stats.hp, status: null, statusTurns: 0 };

  battleLog.push("========================================");
  battleLog.push(`⚔️ BATTLE: ${p1.name.toUpperCase()} vs ${p2.name.toUpperCase()} ⚔️`);
  battleLog.push("========================================");
  battleLog.push(`🔵 ${p1.name}: ${p1.stats.hp} HP | ${p1.types.join('/')}`);
  battleLog.push(`🔴 ${p2.name}: ${p2.stats.hp} HP | ${p2.types.join('/')}`);
  if (p1.stats.speed > p2.stats.speed) battleLog.push(`⚡ Speed Advantage: ${p1.name} will attack first!`);
  else battleLog.push(`⚡ Speed Advantage: ${p2.name} will attack first!`);
  
  handleEntryAbilities(p1, p2, battleLog);
  handleEntryAbilities(p2, p1, battleLog);
  
  battleLog.push("\n--- BATTLE BEGINS! ---\n");

  let turn = 1;
  while (p1.currentHp > 0 && p2.currentHp > 0) {
    battleLog.push(`--- Turn ${turn} ---`);
    battleLog.push(`${p1.name}: ${Math.round(p1.currentHp)}/${p1.stats.hp} HP | ${p2.name}: ${Math.round(p2.currentHp)}/${p2.stats.hp} HP`);

    const [first, second] = p1.stats.speed >= p2.stats.speed ? [p1, p2] : [p2, p1];

    if (first.currentHp > 0) performTurn(first, second, battleLog);
    if (second.currentHp <= 0) break;
    if (second.currentHp > 0) performTurn(second, first, battleLog);
    if (first.currentHp <= 0) break;
    
    applyEndOfTurnStatus(p1, battleLog);
    if (p1.currentHp <= 0) break;
    applyEndOfTurnStatus(p2, battleLog);
    if (p2.currentHp <= 0) break;

    battleLog.push("");
    turn++;
    if (turn > 50) { battleLog.push("The battle is too long! It's a draw!"); break; }
  }

  const winner = p1.currentHp > 0 ? p1 : p2;
  const loser = winner === p1 ? p2 : p1;
  battleLog.push(`${loser.name} has fainted!`);
  battleLog.push(`\n--- 🏆 ${winner.name.toUpperCase()} WINS THE BATTLE! ---`);
  
  battleLog.push("\n========================================");
  battleLog.push("🧠 STRATEGIC ANALYSIS");
  battleLog.push("========================================");
  if (winner.stats.speed > loser.stats.speed) battleLog.push(`• Speed was a key factor, allowing ${winner.name} to control the battle's pace.`);
  if (didHaveTypeAdvantage(winner, loser)) battleLog.push(`• ${winner.name} exploited a type advantage against ${loser.name}.`);
  battleLog.push(`• With ${Math.round(winner.currentHp)} HP remaining, ${winner.name} secured a decisive victory.`);

  return battleLog;
}

function performTurn(attacker: BattlingPokemon, defender: BattlingPokemon, battleLog: string[]) {
  if (attacker.status === 'paralysis' && Math.random() < 0.25) { battleLog.push(`⚡ ${attacker.name} is fully paralyzed and can't move!`); return; }
  if (attacker.status === 'sleep') {
    if (attacker.statusTurns > 0) { battleLog.push(`😴 ${attacker.name} is fast asleep.`); attacker.statusTurns--; return; }
    battleLog.push(`☀️ ${attacker.name} woke up!`); attacker.status = null;
  }
  if (attacker.status === 'freeze') {
    if (Math.random() < 0.2) { battleLog.push(`🧊 ${attacker.name} thawed out!`); attacker.status = null; } 
    else { battleLog.push(`🥶 ${attacker.name} is frozen solid!`); return; }
  }

  const { moveName, move } = selectMove(attacker, defender);

  if (defender.abilities.includes('levitate') && move.type === 'ground') { battleLog.push(`✨ ${defender.name}'s Levitate made the attack miss!`); return; }
  if (defender.abilities.includes('flash-fire') && move.type === 'fire') { battleLog.push(`🔥 ${defender.name}'s Flash Fire absorbed the attack!`); return; }
  
  battleLog.push(`🎯 ${attacker.name} used ${moveName}!`);

  if (move.power > 0) {
    const { damage, effectiveness, isCritical } = calculateDamage(attacker, defender, move);
    if (isCritical) battleLog.push("💥 A critical hit!");
    defender.currentHp = Math.max(0, defender.currentHp - damage);
    if (effectiveness > 1) battleLog.push("🔥 It's super effective!");
    if (effectiveness < 1 && effectiveness > 0) battleLog.push("🛡️ It's not very effective...");
    if (effectiveness === 0) battleLog.push("❌ It had no effect!");
    battleLog.push(`💥 It dealt ${damage} damage to ${defender.name}. (${Math.round(defender.currentHp)} HP left)`);
  }

  if (move.effect && defender.status === null && move.chance && Math.random() < move.chance) {
    defender.status = move.effect;
    if (move.effect === 'sleep') defender.statusTurns = Math.floor(Math.random() * 3) + 1;
    battleLog.push(`✨ ${defender.name} is now ${move.effect}!`);
  }
}

function applyEndOfTurnStatus(pokemon: BattlingPokemon, battleLog: string[]) {
    if (pokemon.status === 'burn') {
        const damage = Math.floor(pokemon.stats.hp / 16);
        pokemon.currentHp = Math.max(0, pokemon.currentHp - damage);
        battleLog.push(`🔥 ${pokemon.name} is hurt by its burn! (${damage} damage)`);
    }
    if (pokemon.status === 'poison') {
        const damage = Math.floor(pokemon.stats.hp / 8);
        pokemon.currentHp = Math.max(0, pokemon.currentHp - damage);
        battleLog.push(`☠️ ${pokemon.name} is hurt by poison! (${damage} damage)`);
    }
}

function calculateDamage(attacker: BattlingPokemon, defender: BattlingPokemon, move: Move): { damage: number, effectiveness: number, isCritical: boolean } {
  const LEVEL = 50;
  let attack = attacker.stats.attack;
  if (attacker.status === 'burn') attack /= 2;
  const defense = defender.stats.defense;
  let baseDamage = ((((2 * LEVEL / 5 + 2) * move.power * (attack / defense)) / 50) + 2);
  const isCritical = Math.random() < (1 / 24);
  if (isCritical) baseDamage *= 1.5;
  if (attacker.types.includes(move.type)) baseDamage *= 1.5;
  let effectiveness = 1;
  defender.types.forEach(defenseType => { effectiveness *= typeEffectiveness[move.type]?.[defenseType] ?? 1; });
  baseDamage *= effectiveness;
  baseDamage *= (Math.random() * (1.0 - 0.85) + 0.85);
  const finalDamage = Math.max(1, Math.floor(baseDamage));
  return { damage: finalDamage, effectiveness, isCritical };
}

function handleEntryAbilities(pokemon: BattlingPokemon, opponent: BattlingPokemon, battleLog: string[]) {
    if (pokemon.abilities.includes('intimidate')) {
        battleLog.push(`😱 ${pokemon.name}'s Intimidate lowered ${opponent.name}'s Attack!`);
    }
}

function selectMove(attacker: BattlingPokemon, defender: BattlingPokemon): { moveName: string; move: Move } {
    const availableMoves = attacker.moves.map(name => ({ name, data: moveData[name] })).filter(m => m.data);
    if (availableMoves.length === 0) return { moveName: 'struggle', move: { power: 50, type: 'normal' } };
    let bestMove = availableMoves[0];
    let maxScore = -1;
    for (const potentialMove of availableMoves) {
        let score = 0;
        if (potentialMove.data.power > 0) {
            let effectiveness = 1;
            defender.types.forEach(defenseType => { effectiveness *= typeEffectiveness[potentialMove.data.type]?.[defenseType] ?? 1; });
            score = potentialMove.data.power * effectiveness;
        } else if (potentialMove.data.effect && defender.status === null) { score = 40; }
        if (score > maxScore) { maxScore = score; bestMove = potentialMove; }
    }
    return { moveName: bestMove.name, move: bestMove.data };
}

function didHaveTypeAdvantage(winner: Pokemon, loser: Pokemon): boolean {
    for (const moveName of winner.moves) {
        const move = moveData[moveName];
        if (move && move.power > 0) {
            let effectiveness = 1;
            loser.types.forEach(defenseType => { effectiveness *= typeEffectiveness[move.type]?.[defenseType] ?? 1; });
            if (effectiveness > 1) return true;
        }
    }
    return false;
}

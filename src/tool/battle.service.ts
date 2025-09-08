// src/tool/battle.service.ts

import { Pokemon, StatusEffect, Move } from '../pokemon.types';

type TypeChart = { [key: string]: { [key: string]: number } };

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

type BattlingPokemon = Pokemon & {
  currentHp: number;
  status: StatusEffect;
  statusTurns: number;
};

function getPokemonDetails(p: Pokemon): string[] {
    const totalStats = p.stats.hp + p.stats.attack + p.stats.defense + p.stats.specialAttack + p.stats.specialDefense + p.stats.speed;
    return [
        `🏷️ **Type:** ${p.types.join(' / ')}`,
        `📊 **Base Stats:**`,
        `   ❤️ HP: ${p.stats.hp} | ⚔️ Atk: ${p.stats.attack} | 🛡️ Def: ${p.stats.defense}`,
        `   🔮 SpA: ${p.stats.specialAttack} | ✨ SpD: ${p.stats.specialDefense} | 💨 Spd: ${p.stats.speed}`,
        `   📈 **Total: ${totalStats}**`,
        `⚡ **Abilities:** ${p.abilities.join(', ')}`,
        `🥊 **Key Moves:** ${p.moves.filter(m => m.power && m.power > 50).slice(0, 4).map(m => m.name).join(', ')}`
    ];
}

export function simulateBattle(pokemon1: Pokemon, pokemon2: Pokemon): string[] {
  const battleLog: string[] = [];
  let p1: BattlingPokemon = { ...pokemon1, currentHp: pokemon1.stats.hp, status: null, statusTurns: 0 };
  let p2: BattlingPokemon = { ...pokemon2, currentHp: pokemon2.stats.hp, status: null, statusTurns: 0 };

  battleLog.push("========================================");
  battleLog.push(`⚔️ BATTLE: ${p1.name.toUpperCase()} vs ${p2.name.toUpperCase()} ⚔️`);
  battleLog.push("========================================");
  battleLog.push(`\n🔵 **${p1.name.toUpperCase()}** (#${p1.id})`);
  battleLog.push(...getPokemonDetails(p1).map(s => `   ${s}`));
  battleLog.push(`\n🔴 **${p2.name.toUpperCase()}** (#${p2.id})`);
  battleLog.push(...getPokemonDetails(p2).map(s => `   ${s}`));
  
  if (p1.stats.speed > p2.stats.speed) battleLog.push(`\n⚡ **Speed Advantage:** ${p1.name} is faster and will attack first!`);
  else if (p2.stats.speed > p1.stats.speed) battleLog.push(`\n⚡ **Speed Advantage:** ${p2.name} is faster and will attack first!`);
  else battleLog.push(`\n⚡ **Speed Tie:** Both Pokémon have the same speed!`);
  
  battleLog.push("\n--- BATTLE BEGINS! ---\n");

  let turn = 1;
  while (p1.currentHp > 0 && p2.currentHp > 0) {
    battleLog.push(`--- Turn ${turn} ---`);
    const hpBar = (p: BattlingPokemon) => `[${'█'.repeat(Math.ceil(p.currentHp/p.stats.hp*10))}${' '.repeat(10-Math.ceil(p.currentHp/p.stats.hp*10))}]`;
    battleLog.push(`${p1.name}: ${hpBar(p1)} ${Math.round(p1.currentHp)}/${p1.stats.hp} HP ${p1.status ? `(${p1.status})` : ''}`);
    battleLog.push(`${p2.name}: ${hpBar(p2)} ${Math.round(p2.currentHp)}/${p2.stats.hp} HP ${p2.status ? `(${p2.status})` : ''}`);

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
    if (turn > 50) { battleLog.push("The battle timed out! It's a draw!"); break; }
  }

  const winner = p1.currentHp > 0 ? p1 : p2;
  const loser = winner === p1 ? p2 : p1;
  battleLog.push(`\n💀 ${loser.name} has fainted!`);
  battleLog.push(`\n--- 🏆 ${winner.name.toUpperCase()} WINS THE BATTLE! ---`);
  
  battleLog.push("\n========================================");
  battleLog.push("🧠 STRATEGIC ANALYSIS");
  battleLog.push("========================================");
  if (winner.stats.speed > loser.stats.speed) battleLog.push(`• **Speed Kills:** ${winner.name}'s superior speed (${winner.stats.speed} vs ${loser.stats.speed}) was a decisive factor, allowing it to dictate the pace of the battle.`);
  if (didHaveTypeAdvantage(winner, loser)) battleLog.push(`• **Type Mastery:** ${winner.name} effectively exploited a type advantage against ${loser.name}, dealing massive damage with super-effective moves.`);
  battleLog.push(`• **Decisive Victory:** With ${Math.round(winner.currentHp)} HP remaining, ${winner.name} proved its dominance in this matchup.`);

  return battleLog;
}

function performTurn(attacker: BattlingPokemon, defender: BattlingPokemon, battleLog: string[]) {
  if (attacker.status === 'paralysis' && Math.random() < 0.25) { battleLog.push(`   ⚡ ${attacker.name} is fully paralyzed and can't move!`); return; }
  if (attacker.status === 'sleep') {
    if (attacker.statusTurns > 0) { battleLog.push(`   😴 ${attacker.name} is fast asleep.`); attacker.statusTurns--; return; }
    battleLog.push(`   ☀️ ${attacker.name} woke up!`); attacker.status = null;
  }
  if (attacker.status === 'freeze') {
    if (Math.random() < 0.2) { battleLog.push(`   🧊 ${attacker.name} thawed out!`); attacker.status = null; } 
    else { battleLog.push(`   🥶 ${attacker.name} is frozen solid!`); return; }
  }

  const move = selectMove(attacker, defender);
  if (!move) { battleLog.push(`   ${attacker.name} is out of moves!`); return; }

  battleLog.push(`   🎯 ${attacker.name} used ${move.name.replace(/-/g, ' ')}!`);
  
  if ((move.accuracy || 101) <= 100 && Math.random() > (move.accuracy || 100) / 100) {
      battleLog.push(`   💨 The attack missed!`);
      return;
  }

  if (move.power && move.power > 0) {
    const { damage, effectiveness, isCritical } = calculateDamage(attacker, defender, move);
    if (isCritical) battleLog.push("   💥 A critical hit!");
    
    let effectivenessText = '';
    if (effectiveness > 1) effectivenessText = " (It's super effective!)";
    if (effectiveness < 1 && effectiveness > 0) effectivenessText = " (It's not very effective...)";
    if (effectiveness === 0) effectivenessText = " (It had no effect!)";

    defender.currentHp = Math.max(0, defender.currentHp - damage);
    battleLog.push(`   💥 It dealt ${damage} damage to ${defender.name}.${effectivenessText}`);
  }

  if (move.effect && defender.status === null && move.chance && Math.random() < move.chance) {
    defender.status = move.effect;
    if (move.effect === 'sleep') defender.statusTurns = Math.floor(Math.random() * 3) + 1;
    battleLog.push(`   ✨ ${defender.name} is now ${move.effect}!`);
  }
}

function applyEndOfTurnStatus(pokemon: BattlingPokemon, battleLog: string[]) {
    if (pokemon.status === 'burn') {
        const damage = Math.floor(pokemon.stats.hp / 16);
        pokemon.currentHp = Math.max(0, pokemon.currentHp - damage);
        battleLog.push(`   🔥 ${pokemon.name} is hurt by its burn! (${damage} damage)`);
    }
    if (pokemon.status === 'poison') {
        const damage = Math.floor(pokemon.stats.hp / 8);
        pokemon.currentHp = Math.max(0, pokemon.currentHp - damage);
        battleLog.push(`   ☠️ ${pokemon.name} is hurt by poison! (${damage} damage)`);
    }
}

function calculateDamage(attacker: BattlingPokemon, defender: BattlingPokemon, move: Move): { damage: number, effectiveness: number, isCritical: boolean } {
  const LEVEL = 50;
  if (!move.power) return { damage: 0, effectiveness: 1, isCritical: false };
  
  let attackStat: number;
  let defenseStat: number;

  if (move.category === 'physical') {
      attackStat = attacker.stats.attack;
      defenseStat = defender.stats.defense;
      if (attacker.status === 'burn') attackStat /= 2;
  } else if (move.category === 'special') {
      attackStat = attacker.stats.specialAttack;
      defenseStat = defender.stats.specialDefense;
  } else {
      return { damage: 0, effectiveness: 1, isCritical: false };
  }

  let baseDamage = (((2 * LEVEL / 5 + 2) * move.power * (attackStat / defenseStat)) / 50) + 2;
  
  const isCritical = Math.random() < (1 / 24);
  if (isCritical) baseDamage *= 1.5;
  
  if (attacker.types.includes(move.type)) baseDamage *= 1.5; // STAB
  
  let effectiveness = 1;
  defender.types.forEach(defenseType => { effectiveness *= typeEffectiveness[move.type]?.[defenseType] ?? 1; });
  baseDamage *= effectiveness;
  
  baseDamage *= (Math.random() * (1.0 - 0.85) + 0.85); // Random factor
  
  const finalDamage = Math.max(1, Math.floor(baseDamage));
  return { damage: finalDamage, effectiveness, isCritical };
}

function selectMove(attacker: BattlingPokemon, defender: BattlingPokemon): Move | null {
    const attackingMoves = attacker.moves.filter(m => m.power && m.power > 0);
    if (attackingMoves.length === 0) return null;

    let bestMove: Move | null = null;
    let maxScore = -1;

    for (const move of attackingMoves) {
        let effectiveness = 1;
        defender.types.forEach(defenseType => {
            effectiveness *= typeEffectiveness[move.type]?.[defenseType] ?? 1;
        });
        
        const score = (move.power || 0) * effectiveness * ((move.accuracy || 100) / 100);
        
        if (score > maxScore) {
            maxScore = score;
            bestMove = move;
        }
    }
    return bestMove || attackingMoves[0];
}

function didHaveTypeAdvantage(winner: Pokemon, loser: Pokemon): boolean {
    for (const move of winner.moves) {
        if (move && move.power && move.power > 0) {
            let effectiveness = 1;
            loser.types.forEach(defenseType => { effectiveness *= typeEffectiveness[move.type]?.[defenseType] ?? 1; });
            if (effectiveness > 1) return true;
        }
    }
    return false;
}
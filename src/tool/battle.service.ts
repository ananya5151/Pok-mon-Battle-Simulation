// src/tool/battle.service.ts

import { Pokemon, BattlingPokemon, Move } from '../pokemon.types';
import { config } from '../config';

type TypeChart = { [key: string]: { [key: string]: number } };

// --- FIXED TYPE CHART ---
// Added the missing psychic vs ghost = 0 immunity.
const typeEffectiveness: TypeChart = {
    "normal": { "rock": 0.5, "ghost": 0, "steel": 0.5 }, "fire": { "fire": 0.5, "water": 0.5, "grass": 2, "ice": 2, "bug": 2, "rock": 0.5, "dragon": 0.5, "steel": 2 },
    "water": { "fire": 2, "water": 0.5, "grass": 0.5, "ground": 2, "rock": 2, "dragon": 0.5 }, "electric": { "water": 2, "electric": 0.5, "grass": 0.5, "ground": 0, "flying": 2, "dragon": 0.5 },
    "grass": { "fire": 0.5, "water": 2, "grass": 0.5, "poison": 0.5, "ground": 2, "flying": 0.5, "bug": 0.5, "rock": 2, "dragon": 0.5, "steel": 0.5 },
    "ice": { "fire": 0.5, "water": 0.5, "grass": 2, "ice": 0.5, "ground": 2, "flying": 2, "dragon": 2, "steel": 0.5 },
    "fighting": { "normal": 2, "ice": 2, "poison": 0.5, "flying": 0.5, "psychic": 0.5, "bug": 0.5, "rock": 2, "ghost": 0, "dark": 2, "steel": 2, "fairy": 0.5 },
    "poison": { "grass": 2, "poison": 0.5, "ground": 0.5, "rock": 0.5, "ghost": 0.5, "steel": 0, "fairy": 2 }, "ground": { "fire": 2, "electric": 2, "grass": 0.5, "poison": 2, "flying": 0, "bug": 0.5, "rock": 2, "steel": 2 },
    "flying": { "electric": 0.5, "grass": 2, "fighting": 2, "bug": 2, "rock": 0.5, "steel": 0.5 }, "psychic": { "fighting": 2, "poison": 2, "psychic": 0.5, "dark": 0, "steel": 0.5, "ghost": 0 },
    "bug": { "fire": 0.5, "grass": 2, "fighting": 0.5, "poison": 0.5, "flying": 0.5, "psychic": 2, "ghost": 0.5, "dark": 2, "steel": 0.5, "fairy": 0.5 },
    "rock": { "fire": 2, "ice": 2, "fighting": 0.5, "ground": 0.5, "flying": 2, "bug": 2, "steel": 0.5 }, "ghost": { "normal": 0, "psychic": 2, "ghost": 2, "dark": 0.5 },
    "dragon": { "dragon": 2, "steel": 0.5, "fairy": 0 }, "dark": { "fighting": 0.5, "psychic": 2, "ghost": 2, "dark": 0.5, "fairy": 0.5 },
    "steel": { "fire": 0.5, "water": 0.5, "electric": 0.5, "ice": 2, "rock": 2, "steel": 0.5, "fairy": 2 }, "fairy": { "fire": 0.5, "fighting": 2, "poison": 0.5, "dragon": 2, "dark": 2, "steel": 0.5 }
};

export class BattleSimulator {
    private p1: BattlingPokemon;
    private p2: BattlingPokemon;
    private battleLog: string[] = [];
    private turn = 1;

    constructor(pokemon1: Pokemon, pokemon2: Pokemon) {
        this.p1 = { ...pokemon1, currentHp: pokemon1.stats.hp, status: null };
        this.p2 = { ...pokemon2, currentHp: pokemon2.stats.hp, status: null };
    }

    private getPokemonDetails(p: Pokemon): string[] {
        const totalStats = p.stats.hp + p.stats.attack + p.stats.defense + p.stats.specialAttack + p.stats.specialDefense + p.stats.speed;
        return [
            `🏷️ **Type:** ${p.types.join(' / ')}`,
            `📊 **Base Stats:**`,
            `   ❤️ HP: ${p.stats.hp} | ⚔️ Atk: ${p.stats.attack} | 🛡️ Def: ${p.stats.defense}`,
            `   🔮 SpA: ${p.stats.specialAttack} | ✨ SpD: ${p.stats.specialDefense} | 💨 Spd: ${p.stats.speed}`,
            `   📈 **Total: ${totalStats}**`
        ];
    }

    private generatePreBattleSummary() {
        this.battleLog.push("========================================");
        this.battleLog.push(`⚔️ BATTLE: ${this.p1.name.toUpperCase()} vs ${this.p2.name.toUpperCase()} ⚔️`);
        this.battleLog.push("========================================");
        this.battleLog.push(`\n🔵 **${this.p1.name.toUpperCase()}** (#${this.p1.id})`);
        this.battleLog.push(...this.getPokemonDetails(this.p1).map(s => `   ${s}`));
        this.battleLog.push(`\n🔴 **${this.p2.name.toUpperCase()}** (#${this.p2.id})`);
        this.battleLog.push(...this.getPokemonDetails(this.p2).map(s => `   ${s}`));
        
        if (this.p1.stats.speed > this.p2.stats.speed) this.battleLog.push(`\n⚡ **Speed Advantage:** ${this.p1.name} is faster and will attack first!`);
        else if (this.p2.stats.speed > this.p1.stats.speed) this.battleLog.push(`\n⚡ **Speed Advantage:** ${this.p2.name} is faster and will attack first!`);
        else this.battleLog.push(`\n⚡ **Speed Tie:** Both Pokémon have the same speed!`);
        
        this.battleLog.push("\n--- BATTLE BEGINS! ---\n");
    }

    private generatePostBattleAnalysis(winner: BattlingPokemon, loser: BattlingPokemon) {
        this.battleLog.push("\n========================================");
        this.battleLog.push("🧠 STRATEGIC ANALYSIS");
        this.battleLog.push("========================================");
        if (winner.stats.speed > loser.stats.speed) this.battleLog.push(`• **Speed Kills:** ${winner.name}'s superior speed (${winner.stats.speed} vs ${loser.stats.speed}) was a decisive factor, allowing it to dictate the pace of the battle.`);
        
        let advantageFound = false;
        for (const move of winner.moves) {
            if (move?.power) {
                let effectiveness = 1;
                loser.types.forEach(defenseType => { effectiveness *= typeEffectiveness[move.type]?.[defenseType] ?? 1; });
                if (effectiveness > 1) advantageFound = true;
            }
        }
        if (advantageFound) this.battleLog.push(`• **Type Mastery:** ${winner.name} successfully exploited a type advantage against ${loser.name}, dealing massive damage with super-effective moves.`);

        this.battleLog.push(`• **Decisive Victory:** With ${Math.round(winner.currentHp)} HP remaining, ${winner.name} proved its dominance in this matchup.`);
    }

    private performTurn(attacker: BattlingPokemon, defender: BattlingPokemon) {
        if (attacker.status?.name === 'paralysis' && Math.random() < 0.25) { this.battleLog.push(`   ⚡ ${attacker.name} is fully paralyzed and can't move!`); return; }
        
        const move = this.selectMove(attacker, defender);
        if (!move) { this.battleLog.push(`   ${attacker.name} has no usable moves!`); return; }
        
        const moveName = move.name.replace(/-/g, ' ');
        this.battleLog.push(`   🎯 ${attacker.name} used **${moveName}**!`);
      
        if ((move.accuracy || 101) <= 100 && Math.random() > (move.accuracy || 100) / 100) {
            this.battleLog.push(`   💨 The attack missed!`);
            return;
        }

        if (move.power) {
            const { damage, effectiveness } = this.calculateDamage(attacker, defender, move);
            
            if (effectiveness === 0) {
                this.battleLog.push(`   ❌ It had no effect on ${defender.name}!`);
                return;
            }
            
            const isCritical = Math.random() < config.battle.critChance;
            const finalDamage = isCritical ? Math.floor(damage * config.battle.critMultiplier) : damage;

            let logParts = [];
            if (isCritical) logParts.push("💥 A critical hit!");
            
            let effectivenessText = '';
            if (effectiveness > 1) effectivenessText = "It's super effective!";
            if (effectiveness < 1) effectivenessText = "It's not very effective...";

            defender.currentHp = Math.max(0, defender.currentHp - finalDamage);
            logParts.push(`Dealt **${finalDamage} damage** to ${defender.name}.`);
            if(effectivenessText) logParts.push(effectivenessText);

            this.battleLog.push(`   ${logParts.join(' ')}`);
        }
    }

    private calculateDamage(attacker: BattlingPokemon, defender: BattlingPokemon, move: Move) {
        if (!move.power) return { damage: 0, effectiveness: 1 };
      
        let attackStat: number, defenseStat: number;

        if (move.category === 'physical') {
            attackStat = attacker.stats.attack;
            if (attacker.status?.name === 'burn') attackStat /= 2;
            defenseStat = defender.stats.defense;
        } else {
            attackStat = attacker.stats.specialAttack;
            defenseStat = defender.stats.specialDefense;
        }
    
        let baseDamage = (((2 * config.battle.defaultLevel / 5 + 2) * move.power * (attackStat / defenseStat)) / 50) + 2;
        
        if (attacker.types.includes(move.type)) baseDamage *= config.battle.stabMultiplier;
        
        let effectiveness = 1;
        defender.types.forEach(defenseType => { effectiveness *= typeEffectiveness[move.type]?.[defenseType] ?? 1; });
        baseDamage *= effectiveness;
        
        baseDamage *= (Math.random() * (config.battle.randomFactor.max - config.battle.randomFactor.min) + config.battle.randomFactor.min);
        
        const finalDamage = Math.max(1, Math.floor(baseDamage));
        return { damage: finalDamage, effectiveness };
    }

    private selectMove(attacker: BattlingPokemon, defender: BattlingPokemon): Move | null {
        const attackingMoves = attacker.moves.filter(m => m.power);
        if (attackingMoves.length === 0) return attacker.moves[0] || null;

        return attackingMoves.reduce((bestMove, currentMove) => {
            const bestScore = this.calculateMoveScore(bestMove, defender);
            const currentScore = this.calculateMoveScore(currentMove, defender);
            return currentScore > bestScore ? currentMove : bestMove;
        });
    }

    private calculateMoveScore(move: Move, defender: BattlingPokemon): number {
        let effectiveness = 1;
        defender.types.forEach(defenseType => {
            effectiveness *= typeEffectiveness[move.type]?.[defenseType] ?? 1;
        });
        return (move.power || 0) * effectiveness * ((move.accuracy || 100) / 100);
    }
    
    public run(): string[] {
        this.generatePreBattleSummary();

        while (this.p1.currentHp > 0 && this.p2.currentHp > 0 && this.turn <= config.battle.maxTurns) {
            this.battleLog.push(`--- Turn ${this.turn} ---`);
            const hpBar = (p: BattlingPokemon) => `[${'█'.repeat(Math.ceil(p.currentHp/p.stats.hp*10))}${' '.repeat(10-Math.ceil(p.currentHp/p.stats.hp*10))}]`;
            this.battleLog.push(`${this.p1.name}: ${hpBar(this.p1)} ${Math.round(this.p1.currentHp)}/${this.p1.stats.hp} HP`);
            this.battleLog.push(`${this.p2.name}: ${hpBar(this.p2)} ${Math.round(this.p2.currentHp)}/${this.p2.stats.hp} HP`);

            const [first, second] = this.p1.stats.speed >= this.p2.stats.speed ? [this.p1, this.p2] : [this.p2, this.p1];

            if (first.currentHp > 0) this.performTurn(first, second);
            if (second.currentHp <= 0) {
                this.battleLog.push(`\n💀 ${second.name} has fainted!`);
                break;
            }

            if (second.currentHp > 0) this.performTurn(second, first);
            if (first.currentHp <= 0) {
                this.battleLog.push(`\n💀 ${first.name} has fainted!`);
                break;
            }
            
            this.battleLog.push("");
            this.turn++;
        }

        if (this.turn > config.battle.maxTurns) {
            this.battleLog.push("The battle timed out! It's a draw!");
            return this.battleLog;
        }

        const winner = this.p1.currentHp > 0 ? this.p1 : this.p2;
        const loser = winner === this.p1 ? this.p2 : this.p1;
        this.battleLog.push(`\n--- 🏆 ${winner.name.toUpperCase()} WINS THE BATTLE! ---`);

        this.generatePostBattleAnalysis(winner, loser);

        return this.battleLog;
    }
}
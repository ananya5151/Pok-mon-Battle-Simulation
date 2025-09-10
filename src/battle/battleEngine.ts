import { BattleAction, BattleLog, BattlePokemon, BattleResult, StatusEffect } from '../types/battle';
import { Pokemon, Move } from '../types/pokemon';
import { DamageCalculator } from './damageCalculator';
import { StatusEffectManager } from './statusEffects';
import { RNG } from '../utils/rng';

export class BattleEngine {
    private movePoolSize: number;

    constructor(movePoolSize = 8) {
        this.movePoolSize = Math.max(1, Math.min(movePoolSize, 12)); // cap to data layer limit
    }
    prepareBattlePokemon(pokemon: Pokemon, level = 50): BattlePokemon {
        // Simple effective stat scaling to reduce one-shotting
        const scale = (base: number) => Math.max(1, Math.floor(((2 * base) * level) / 100 + 5));
        const eff = {
            hp: Math.max(1, Math.floor(((2 * pokemon.baseStats.hp) * level) / 100 + level + 10)),
            attack: scale(pokemon.baseStats.attack),
            defense: scale(pokemon.baseStats.defense),
            specialAttack: scale(pokemon.baseStats.specialAttack),
            specialDefense: scale(pokemon.baseStats.specialDefense),
            speed: scale(pokemon.baseStats.speed),
        };
        return {
            pokemon,
            currentHp: eff.hp,
            statusEffects: [],
            statModifiers: { attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0, accuracy: 0, evasion: 0 },
            selectedMoves: pokemon.moves.slice(0, this.movePoolSize),
            movePP: Object.fromEntries(pokemon.moves.slice(0, this.movePoolSize).map(m => [m.name, m.pp])),
            effectiveStats: eff,
        };
    }

    private selectMove(attacker: BattlePokemon, defender: BattlePokemon, level: number): Move | undefined {
        // Pick the move with highest expected damage using the calculator and accuracy
        const candidates = attacker.selectedMoves.filter(m => (attacker.movePP?.[m.name] ?? 0) > 0);
        if (candidates.length === 0) {
            return undefined;
        }
        let best: Move | undefined;
        let bestScore = -Infinity;
        for (const m of candidates) {
            const acc = (m.accuracy ?? 100) / 100;
            // Estimate damage and add a small STAB/type-weight bonus to break ties more naturally
            const est = DamageCalculator.calculateDamage(attacker, defender, m, level, 0.925);
            const stab = attacker.pokemon.types.includes(m.type) ? 1.1 : 1.0; // mild tie-breaker, true STAB in calculator
            const score = est * acc * stab;
            if (score > bestScore) { bestScore = score; best = m; }
        }
        return best;
    }

    private isFainted(p: BattlePokemon): boolean {
        return p.currentHp <= 0;
    }

    private processTurn(p1: BattlePokemon, p2: BattlePokemon, turn: number, rng: RNG, level: number): BattleLog {
        const actions: BattleAction[] = [];

        // Speed tie: simple order by speed
        const s1 = p1.effectiveStats?.speed ?? p1.pokemon.baseStats.speed;
        const s2 = p2.effectiveStats?.speed ?? p2.pokemon.baseStats.speed;
        const first = s1 >= s2 ? p1 : p2;
        const second = first === p1 ? p2 : p1;

        // First attacks
        actions.push(...this.executeMove(first, second, rng, level));

        // Check faint
        if (!this.isFainted(second)) {
            actions.push(...this.executeMove(second, first, rng, level));
        }

        // End of turn status
        actions.push(...StatusEffectManager.processStatusEffects(first));
        actions.push(...StatusEffectManager.processStatusEffects(second));

        const result = this.isBattleOver(p1, p2) ? { winner: this.determineWinner(p1, p2), battleLog: [], turns: turn } : undefined;
        const hp = {
            [p1.pokemon.name]: { hp: p1.currentHp, max: p1.effectiveStats?.hp ?? p1.pokemon.baseStats.hp },
            [p2.pokemon.name]: { hp: p2.currentHp, max: p2.effectiveStats?.hp ?? p2.pokemon.baseStats.hp },
        };
        return { turn, actions, result, hp } as BattleLog;
    }

    private executeMove(attacker: BattlePokemon, defender: BattlePokemon, rng: RNG, level: number): BattleAction[] {
        const actions: BattleAction[] = [];
        if (this.isFainted(attacker)) {
            return actions;
        }

        // Flinch check (set by previous move effects)
        if (attacker.flinched) {
            actions.push({ actor: attacker.pokemon.name, text: `${attacker.pokemon.name} flinched and couldn't move!` });
            attacker.flinched = false; // consumed
            return actions;
        }

        // Sleep handling
        if (attacker.statusEffects.includes(StatusEffect.SLEEP)) {
            const cnt = attacker.counters?.sleep ?? 0;
            if ((attacker.counters ||= {}).sleep === undefined) {
                attacker.counters.sleep = rng.int(1, 3); // sleep 1-3 turns
            }
            if ((attacker.counters.sleep as number) > 0) {
                (attacker.counters.sleep as number)--;
                actions.push({ actor: attacker.pokemon.name, text: `${attacker.pokemon.name} is fast asleep.` });
                return actions;
            } else {
                // Wake up
                attacker.statusEffects = attacker.statusEffects.filter(s => s !== StatusEffect.SLEEP);
                actions.push({ actor: attacker.pokemon.name, text: `${attacker.pokemon.name} woke up!` });
            }
        }

        // Freeze handling (20% thaw per turn)
        if (attacker.statusEffects.includes(StatusEffect.FREEZE)) {
            if (rng.chance(0.2)) {
                attacker.statusEffects = attacker.statusEffects.filter(s => s !== StatusEffect.FREEZE);
                actions.push({ actor: attacker.pokemon.name, text: `${attacker.pokemon.name} thawed out!` });
            } else {
                actions.push({ actor: attacker.pokemon.name, text: `${attacker.pokemon.name} is frozen solid!` });
                return actions;
            }
        }

        // Confusion handling: 33% self-hit each turn and 1-4 turns duration
        if (attacker.counters?.confusion !== undefined && (attacker.counters.confusion as number) > 0) {
            (attacker.counters.confusion as number)--;
            actions.push({ actor: attacker.pokemon.name, text: `${attacker.pokemon.name} is confused!` });
            if (rng.chance(0.33)) {
                const selfDmg = Math.max(1, Math.floor((attacker.effectiveStats?.attack ?? attacker.pokemon.baseStats.attack) / 8));
                attacker.currentHp = Math.max(0, attacker.currentHp - selfDmg);
                actions.push({ actor: attacker.pokemon.name, text: `It hurt itself in its confusion for ${selfDmg} damage.` });
                return actions;
            }
            if (attacker.counters.confusion === 0) {
                actions.push({ actor: attacker.pokemon.name, text: `${attacker.pokemon.name} snapped out of confusion!` });
                delete attacker.counters.confusion;
            }
        }

        // Paralysis: 25% chance to be fully paralyzed and skip the move
        if (attacker.statusEffects.includes(StatusEffect.PARALYSIS) && rng.chance(0.25)) {
            actions.push({ actor: attacker.pokemon.name, text: `${attacker.pokemon.name} is paralyzed! It can't move!` });
            return actions;
        }

        const move = this.selectMove(attacker, defender, level);
        if (!move) {
            actions.push({ actor: attacker.pokemon.name, text: `${attacker.pokemon.name} has no PP left! It struggles.` });
            // Minimal struggle: fixed small damage
            const struggleDmg = Math.max(1, Math.floor((attacker.effectiveStats?.attack ?? attacker.pokemon.baseStats.attack) / 10));
            defender.currentHp = Math.max(0, defender.currentHp - struggleDmg);
            const defMax = defender.effectiveStats?.hp ?? defender.pokemon.baseStats.hp;
            actions.push({ actor: attacker.pokemon.name, text: `It dealt ${struggleDmg} damage. ${defender.pokemon.name} HP: ${defender.currentHp}/${defMax}` });
            return actions;
        }

        // Accuracy check
        const acc = move.accuracy ?? 100;
        const hit = rng.next() * 100 < acc;
        if (!hit) {
            // consume 1 PP on miss too
            if (attacker.movePP) {
                attacker.movePP[move.name] = Math.max(0, (attacker.movePP[move.name] ?? 0) - 1);
            }
            actions.push({ actor: attacker.pokemon.name, move: move.name, text: `${attacker.pokemon.name} used ${move.name}, but it missed!` });
            return actions;
        }

        const damage = DamageCalculator.calculateDamage(attacker, defender, move, level, 0.85 + rng.next() * 0.15);
        defender.currentHp = Math.max(0, defender.currentHp - damage);

        // consume PP
        if (attacker.movePP) {
            attacker.movePP[move.name] = Math.max(0, (attacker.movePP[move.name] ?? 0) - 1);
        }

        const defMax = defender.effectiveStats?.hp ?? defender.pokemon.baseStats.hp;
        actions.push({ actor: attacker.pokemon.name, move: move.name, text: `${attacker.pokemon.name} used ${move.name}! It dealt ${damage} damage. ${defender.pokemon.name} HP: ${defender.currentHp}/${defMax}` });

        // Apply simple status/volatile effects from move metadata
        if (move.effects && move.effects.length > 0) {
            for (const eff of move.effects) {
                if (eff.type === 'status' && eff.status) {
                    const chance = (eff.chance ?? 100) / 100;
                    if (rng.chance(chance)) {
                        if (eff.status === 'flinch') {
                            defender.flinched = true;
                            actions.push({ actor: defender.pokemon.name, text: `${defender.pokemon.name} flinched!` });
                        } else {
                            StatusEffectManager.applyStatusEffect(defender, eff.status as any);
                            actions.push({ actor: defender.pokemon.name, text: `${defender.pokemon.name} is afflicted by ${eff.status}!` });
                            // Initialize confusion counter when applied
                            if (eff.status === StatusEffect.CONFUSION) {
                                (defender.counters ||= {}).confusion = rng.int(1, 4);
                            }
                        }
                    }
                }
            }
        }

        return actions;
    }

    isBattleOver(p1: BattlePokemon, p2: BattlePokemon): boolean {
        return this.isFainted(p1) || this.isFainted(p2);
    }

    determineWinner(p1: BattlePokemon, p2: BattlePokemon): string {
        if (this.isFainted(p1) && this.isFainted(p2)) {
            return 'draw';
        }
        return this.isFainted(p1) ? p2.pokemon.name : p1.pokemon.name;
    }

    async simulateBattle(pokemon1: Pokemon, pokemon2: Pokemon, maxTurns = 300, level = 50, seed?: string | number): Promise<BattleResult> {
        const rng = new RNG(seed ?? Date.now());
        const p1 = this.prepareBattlePokemon(pokemon1, level);
        const p2 = this.prepareBattlePokemon(pokemon2, level);

        const battleLog: BattleLog[] = [];
        let turn = 1;

        while (!this.isBattleOver(p1, p2) && turn <= maxTurns) {
            const turnResult = this.processTurn(p1, p2, turn, rng, level);
            battleLog.push(turnResult);
            turn++;
        }

        return {
            winner: this.determineWinner(p1, p2),
            battleLog,
            turns: turn - 1,
            seed: seed ?? 'time',
        };
    }
}

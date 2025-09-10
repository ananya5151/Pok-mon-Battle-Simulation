import { BattlePokemon } from '../types/battle';
import { Move } from '../types/pokemon';
import { TypeEffectivenessCalculator } from './typeEffectiveness';

export class DamageCalculator {
    static calculateDamage(
        attacker: BattlePokemon,
        defender: BattlePokemon,
        move: Move,
        level = 50,
        randomFactor?: number
    ): number {
        if (!move.power || move.category === 'status') {
            return 0;
        }

        const aStats = attacker.effectiveStats ?? attacker.pokemon.baseStats;
        const dStats = defender.effectiveStats ?? defender.pokemon.baseStats;
        const atk = move.category === 'physical' ? aStats.attack : aStats.specialAttack;
        const def = move.category === 'physical' ? dStats.defense : dStats.specialDefense;

        const base = Math.floor(((2 * level) / 5 + 2) * move.power * (atk / Math.max(1, def)) / 50) + 2;

        const stab = attacker.pokemon.types.includes(move.type) ? 1.5 : 1.0;
        const type = TypeEffectivenessCalculator.getEffectiveness(move.type, defender.pokemon.types);
        const random = typeof randomFactor === 'number' ? randomFactor : 0.85 + Math.random() * 0.15;

        const modifier = stab * type * random;

        return Math.max(1, Math.floor(base * modifier));
    }
}

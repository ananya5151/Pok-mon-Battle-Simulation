import { BattleAction, BattlePokemon, StatusEffect } from '../types/battle';

export class StatusEffectManager {
    static applyStatusEffect(pokemon: BattlePokemon, effect: StatusEffect): void {
        if (!pokemon.statusEffects.includes(effect)) {
            pokemon.statusEffects.push(effect);
        }
    }

    static processStatusEffects(pokemon: BattlePokemon): BattleAction[] {
        const actions: BattleAction[] = [];
        for (const effect of pokemon.statusEffects) {
            switch (effect) {
                case StatusEffect.BURN:
                    actions.push({ actor: pokemon.pokemon.name, text: `${pokemon.pokemon.name} is hurt by its burn!` });
                    pokemon.currentHp = Math.max(0, pokemon.currentHp - Math.ceil(pokemon.pokemon.baseStats.hp / 16));
                    break;
                case StatusEffect.POISON:
                    actions.push({ actor: pokemon.pokemon.name, text: `${pokemon.pokemon.name} is hurt by poison!` });
                    pokemon.currentHp = Math.max(0, pokemon.currentHp - Math.ceil(pokemon.pokemon.baseStats.hp / 8));
                    break;
                case StatusEffect.SLEEP:
                    // Sleep decrement handled in engine; just message here
                    actions.push({ actor: pokemon.pokemon.name, text: `${pokemon.pokemon.name} is fast asleep.` });
                    break;
                case StatusEffect.FREEZE:
                    // 20% thaw chance each turn, message here; logic handled in engine
                    actions.push({ actor: pokemon.pokemon.name, text: `${pokemon.pokemon.name} is frozen solid!` });
                    break;
                default:
                    break;
            }
        }
        return actions;
    }
}

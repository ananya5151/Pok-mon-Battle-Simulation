import { PokemonType } from '../types/pokemon';

export class TypeEffectivenessCalculator {
    // Full Gen 6+ style chart (multipliers: 0, 0.5, 1, 2)
    private static effectiveness: Record<PokemonType, Partial<Record<PokemonType, number>>> = {
        [PokemonType.NORMAL]: { [PokemonType.ROCK]: 0.5, [PokemonType.STEEL]: 0.5, [PokemonType.GHOST]: 0.0 },
        [PokemonType.FIRE]: { [PokemonType.GRASS]: 2, [PokemonType.ICE]: 2, [PokemonType.BUG]: 2, [PokemonType.STEEL]: 2, [PokemonType.FIRE]: 0.5, [PokemonType.WATER]: 0.5, [PokemonType.ROCK]: 0.5, [PokemonType.DRAGON]: 0.5 },
        [PokemonType.WATER]: { [PokemonType.FIRE]: 2, [PokemonType.GROUND]: 2, [PokemonType.ROCK]: 2, [PokemonType.WATER]: 0.5, [PokemonType.GRASS]: 0.5, [PokemonType.DRAGON]: 0.5 },
        [PokemonType.ELECTRIC]: { [PokemonType.WATER]: 2, [PokemonType.FLYING]: 2, [PokemonType.ELECTRIC]: 0.5, [PokemonType.GRASS]: 0.5, [PokemonType.DRAGON]: 0.5, [PokemonType.GROUND]: 0.0 },
        [PokemonType.GRASS]: { [PokemonType.WATER]: 2, [PokemonType.GROUND]: 2, [PokemonType.ROCK]: 2, [PokemonType.FIRE]: 0.5, [PokemonType.GRASS]: 0.5, [PokemonType.POISON]: 0.5, [PokemonType.FLYING]: 0.5, [PokemonType.BUG]: 0.5, [PokemonType.DRAGON]: 0.5, [PokemonType.STEEL]: 0.5 },
        [PokemonType.ICE]: { [PokemonType.GRASS]: 2, [PokemonType.GROUND]: 2, [PokemonType.FLYING]: 2, [PokemonType.DRAGON]: 2, [PokemonType.FIRE]: 0.5, [PokemonType.WATER]: 0.5, [PokemonType.ICE]: 0.5, [PokemonType.STEEL]: 0.5 },
        [PokemonType.FIGHTING]: { [PokemonType.NORMAL]: 2, [PokemonType.ICE]: 2, [PokemonType.ROCK]: 2, [PokemonType.DARK]: 2, [PokemonType.STEEL]: 2, [PokemonType.POISON]: 0.5, [PokemonType.FLYING]: 0.5, [PokemonType.PSYCHIC]: 0.5, [PokemonType.BUG]: 0.5, [PokemonType.FAIRY]: 0.5, [PokemonType.GHOST]: 0.0 },
        [PokemonType.POISON]: { [PokemonType.GRASS]: 2, [PokemonType.FAIRY]: 2, [PokemonType.POISON]: 0.5, [PokemonType.GROUND]: 0.5, [PokemonType.ROCK]: 0.5, [PokemonType.GHOST]: 0.5, [PokemonType.STEEL]: 0.0 },
        [PokemonType.GROUND]: { [PokemonType.FIRE]: 2, [PokemonType.ELECTRIC]: 2, [PokemonType.POISON]: 2, [PokemonType.ROCK]: 2, [PokemonType.STEEL]: 2, [PokemonType.GRASS]: 0.5, [PokemonType.BUG]: 0.5, [PokemonType.FLYING]: 0.0 },
        [PokemonType.FLYING]: { [PokemonType.GRASS]: 2, [PokemonType.FIGHTING]: 2, [PokemonType.BUG]: 2, [PokemonType.ELECTRIC]: 0.5, [PokemonType.ROCK]: 0.5, [PokemonType.STEEL]: 0.5 },
        [PokemonType.PSYCHIC]: { [PokemonType.FIGHTING]: 2, [PokemonType.POISON]: 2, [PokemonType.PSYCHIC]: 0.5, [PokemonType.STEEL]: 0.5, [PokemonType.DARK]: 0.0 },
        [PokemonType.BUG]: { [PokemonType.GRASS]: 2, [PokemonType.PSYCHIC]: 2, [PokemonType.DARK]: 2, [PokemonType.FIRE]: 0.5, [PokemonType.FIGHTING]: 0.5, [PokemonType.POISON]: 0.5, [PokemonType.FLYING]: 0.5, [PokemonType.GHOST]: 0.5, [PokemonType.STEEL]: 0.5, [PokemonType.FAIRY]: 0.5 },
        [PokemonType.ROCK]: { [PokemonType.FIRE]: 2, [PokemonType.ICE]: 2, [PokemonType.FLYING]: 2, [PokemonType.BUG]: 2, [PokemonType.FIGHTING]: 0.5, [PokemonType.GROUND]: 0.5, [PokemonType.STEEL]: 0.5 },
        [PokemonType.GHOST]: { [PokemonType.PSYCHIC]: 2, [PokemonType.GHOST]: 2, [PokemonType.DARK]: 0.5, [PokemonType.NORMAL]: 0.0 },
        [PokemonType.DRAGON]: { [PokemonType.DRAGON]: 2, [PokemonType.STEEL]: 0.5, [PokemonType.FAIRY]: 0.0 },
        [PokemonType.DARK]: { [PokemonType.PSYCHIC]: 2, [PokemonType.GHOST]: 2, [PokemonType.FIGHTING]: 0.5, [PokemonType.DARK]: 0.5, [PokemonType.FAIRY]: 0.5 },
        [PokemonType.STEEL]: { [PokemonType.ICE]: 2, [PokemonType.ROCK]: 2, [PokemonType.FAIRY]: 2, [PokemonType.FIRE]: 0.5, [PokemonType.WATER]: 0.5, [PokemonType.ELECTRIC]: 0.5, [PokemonType.STEEL]: 0.5 },
        [PokemonType.FAIRY]: { [PokemonType.FIGHTING]: 2, [PokemonType.DRAGON]: 2, [PokemonType.DARK]: 2, [PokemonType.FIRE]: 0.5, [PokemonType.POISON]: 0.5, [PokemonType.STEEL]: 0.5 },
    } as any;

    static getEffectiveness(attackingType: PokemonType, defendingTypes: PokemonType[]): number {
        const chart = TypeEffectivenessCalculator.effectiveness[attackingType] || {};
        return defendingTypes.reduce((mult, defType) => {
            const v = chart[defType as PokemonType];
            if (v === undefined) {
                return mult;
            }
            return mult * (v as number);
        }, 1);
    }
}

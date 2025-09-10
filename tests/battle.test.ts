import { TypeEffectivenessCalculator } from '../src/battle/typeEffectiveness';
import { PokemonType, Pokemon, Move } from '../src/types/pokemon';
import { BattleEngine } from '../src/battle/battleEngine';

function makeMon(name: string, type: PokemonType): Pokemon {
    return {
        id: 1,
        name,
        types: [type],
        baseStats: { hp: 100, attack: 55, defense: 40, specialAttack: 50, specialDefense: 50, speed: 90 },
        abilities: [],
        moves: [
            { name: 'tackle', type, category: 'physical', power: 50, accuracy: 100, pp: 35 },
        ],
        height: 4,
        weight: 60,
        species: name,
    };
}

test('type effectiveness basic', () => {
    const mult = TypeEffectivenessCalculator.getEffectiveness(PokemonType.FIRE, [PokemonType.GRASS]);
    expect(mult).toBeGreaterThan(1);
});

test('simulate simple battle', async () => {
    const engine = new BattleEngine();
    const p1 = makeMon('Charmander', PokemonType.FIRE);
    const p2 = makeMon('Bulbasaur', PokemonType.GRASS);
    const result = await engine.simulateBattle(p1, p2);
    expect(['Charmander', 'Bulbasaur', 'draw']).toContain(result.winner);
    expect(result.turns).toBeGreaterThan(0);
});

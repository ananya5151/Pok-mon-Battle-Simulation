import { BattleEngine } from '../battle/battleEngine';
import { PokemonDataService } from '../data/pokemonData';

export class BattleTool {
    private battleEngine = new BattleEngine();
    private data = new PokemonDataService();

    getTool(): any {
        return {
            name: 'simulate_battle',
            description: 'Simulate a battle between two Pokémon',
            inputSchema: {
                type: 'object',
                properties: {
                    pokemon1: { type: 'string', description: 'Name or ID of first Pokémon' },
                    pokemon2: { type: 'string', description: 'Name or ID of second Pokémon' },
                    options: {
                        type: 'object',
                        properties: {
                            level: { type: 'number', default: 50 },
                            moves: { type: 'array', items: { type: 'string' } },
                        },
                    },
                },
                required: ['pokemon1', 'pokemon2'],
            },
        } as any;
    }

    async callTool(request: any): Promise<any> {
        const params: any = (request as any).params || {};
        const { pokemon1, pokemon2, options = {} } = params;

        const p1 = await this.data.getPokemon(pokemon1);
        const p2 = await this.data.getPokemon(pokemon2);

        const { level = 50, maxTurns = 300, seed } = options;
        const result = await this.battleEngine.simulateBattle(p1, p2, maxTurns, level, seed);

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(result, null, 2),
                },
            ],
        } as any;
    }
}

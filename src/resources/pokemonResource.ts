import { PokemonDataService } from '../data/pokemonData';

export class PokemonResource {
    private data = new PokemonDataService();

    async getResource(uri: string): Promise<any> {
        // e.g. pokemon://data/pikachu
        const url = new URL(uri);
        const type = url.host; // 'data' | 'stats' | 'moves' | 'types' | 'list'
        const identifier = url.pathname.replace(/^\//, '');

        switch (type) {
            case 'data':
                return this.getPokemonData(identifier);
            case 'stats':
                return this.getPokemonStats(identifier);
            case 'moves':
                return this.getPokemonMoves(identifier);
            case 'types':
                return { name: 'types', uri, mimeType: 'application/json', text: JSON.stringify(['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy']) } as any;
            case 'list':
                return { name: 'list', uri, mimeType: 'application/json', text: JSON.stringify((await this.data.getAllPokemon(50)).map(p => p.name)) } as any;
            default:
                throw new Error(`Unknown resource type: ${type}`);
        }
    }

    listResources(): any[] {
        return [
            { name: 'pikachu-data', uri: 'pokemon://data/pikachu', mimeType: 'application/json', text: '' } as any,
            { name: 'charizard-stats', uri: 'pokemon://stats/charizard', mimeType: 'application/json', text: '' } as any,
            { name: 'bulbasaur-moves', uri: 'pokemon://moves/bulbasaur', mimeType: 'application/json', text: '' } as any,
            { name: 'types', uri: 'pokemon://types', mimeType: 'application/json', text: '' } as any,
            { name: 'list', uri: 'pokemon://list', mimeType: 'application/json', text: '' } as any,
        ];
    }

    private async getPokemonData(name: string): Promise<any> {
        const p = await this.data.getPokemon(name);
        return { name: `${name}-data`, uri: `pokemon://data/${name}`, mimeType: 'application/json', text: JSON.stringify(p) } as any;
    }
    private async getPokemonStats(name: string): Promise<any> {
        const p = await this.data.getPokemon(name);
        return { name: `${name}-stats`, uri: `pokemon://stats/${name}`, mimeType: 'application/json', text: JSON.stringify(p.baseStats) } as any;
    }
    private async getPokemonMoves(name: string): Promise<any> {
        const p = await this.data.getPokemon(name);
        return { name: `${name}-moves`, uri: `pokemon://moves/${name}`, mimeType: 'application/json', text: JSON.stringify(p.moves) } as any;
    }
}

import { PokemonMCPServer } from '../src/server';

test('server constructs', () => {
    const s = new PokemonMCPServer();
    expect(s).toBeTruthy();
});

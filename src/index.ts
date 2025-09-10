import 'dotenv/config';
import { PokemonMCPServer } from './server';

async function main() {
    const server = new PokemonMCPServer();
    await server.run();
}

main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
});

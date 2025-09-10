import 'dotenv/config';
import { PokemonDataService } from './data/pokemonData';
import { BattleEngine } from './battle/battleEngine';
import { interpretCommand } from './utils/llm';

async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log('Usage: npm run cli -- "<command>"');
        console.log('Examples:');
        console.log('  npm run cli -- "battle pikachu vs charizard"');
        console.log('  npm run cli -- "stats bulbasaur"');
        console.log('  npm run cli -- "moves charizard"');
        console.log('  npm run cli -- "list all types"');
        process.exit(1);
    }

    // Optional: --level N and --maxTurns N
    let level = 50;
    let maxTurns = 300;
    const levelIdx = args.findIndex(a => a === '--level');
    if (levelIdx >= 0 && args[levelIdx + 1]) {
        const parsed = parseInt(args[levelIdx + 1], 10);
        if (!Number.isNaN(parsed)) {
            level = parsed;
        }
        args.splice(levelIdx, 2);
    }
    let seed: string | number | undefined;
    const seedIdx = args.findIndex(a => a === '--seed');
    if (seedIdx >= 0 && args[seedIdx + 1]) {
        const s = args[seedIdx + 1];
        const n = Number(s);
        seed = Number.isNaN(n) ? s : n;
        args.splice(seedIdx, 2);
    }
    const mtIdx = args.findIndex(a => a === '--maxTurns');
    // Optional: --count N for moves listing
    let count: number | undefined;
    const countIdx = args.findIndex(a => a === '--count');
    if (countIdx >= 0 && args[countIdx + 1]) {
        const parsed = parseInt(args[countIdx + 1], 10);
        if (!Number.isNaN(parsed)) {
            count = parsed;
        }
        args.splice(countIdx, 2);
    }
    if (mtIdx >= 0 && args[mtIdx + 1]) {
        const parsed = parseInt(args[mtIdx + 1], 10);
        if (!Number.isNaN(parsed)) {
            maxTurns = parsed;
        }
        args.splice(mtIdx, 2);
    }
    // Fallback: if last token is an integer and no --level found, treat it as level
    if (levelIdx < 0 && args.length > 0) {
        const last = args[args.length - 1];
        const parsed = parseInt(last, 10);
        if (!Number.isNaN(parsed)) {
            level = parsed;
            args.pop();
        }
    }
    const text = args.join(' ');
    const data = new PokemonDataService();
    const engine = new BattleEngine(Number(process.env.MOVE_POOL_SIZE) || 8);
    const intent = await interpretCommand(text);

    switch (intent.intent) {
        case 'battle': {
            const p1 = await data.getPokemon(intent.pokemon1);
            const p2 = await data.getPokemon(intent.pokemon2);
            const resLevel = intent.level ?? level;
            const resTurns = intent.maxTurns ?? maxTurns;
            const resSeed = intent.seed ?? seed;
            const result = await engine.simulateBattle(p1, p2, resTurns, resLevel, resSeed);
            console.log(`Battle: ${p1.name} vs ${p2.name} (level ${resLevel}${resSeed !== undefined ? ", seed=" + resSeed : ''})`);
            for (const turn of result.battleLog) {
                console.log(`\nTurn ${turn.turn}:`);
                for (const a of turn.actions) {
                    console.log(`- ${a.text}`);
                }
                if (turn.hp) {
                    const names = Object.keys(turn.hp);
                    const summary = names.map(n => `${n} ${turn.hp![n].hp}/${turn.hp![n].max}`).join(' | ');
                    console.log(`  HP: ${summary}`);
                }
            }
            console.log(`\nWinner: ${result.winner} in ${result.turns} turns`);
            break;
        }
        case 'stats': {
            const p = await data.getPokemon(intent.name);
            console.log(JSON.stringify(p.baseStats, null, 2));
            break;
        }
        case 'moves': {
            const p = await data.getPokemon(intent.name);
            const n = intent.count ?? count ?? p.moves.length;
            console.log(JSON.stringify(p.moves.slice(0, n), null, 2));
            break;
        }
        case 'types': {
            const types = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'];
            console.log(JSON.stringify(types, null, 2));
            break;
        }
        case 'info': {
            const p = await data.getPokemon(intent.name);
            console.log(JSON.stringify(p, null, 2));
            break;
        }
        default: {
            console.log('Unrecognized command. Try: "battle pikachu vs charizard", "stats bulbasaur", or "moves charizard"');
        }
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

import { Server } from '@modelcontextprotocol/sdk/server';
import { logger } from './utils/logger';
import { PokemonDataService } from './data/pokemonData';
import { BattleEngine } from './battle/battleEngine';
import { z } from 'zod';
// We'll load StdioServerTransport at runtime to avoid export-map issues
import { interpretCommand } from './utils/llm';

export class PokemonMCPServer {
    private server: Server;
    private data = new PokemonDataService();
    private engine = new BattleEngine(Number(process.env.MOVE_POOL_SIZE) || 8);

    constructor() {
        this.server = new Server({
            name: 'pokemon-battle-server',
            version: '1.0.0',
            description: 'A Pokémon battle simulation MCP server',
        });

        this.setupHandlers();
    }

    private setupHandlers() {
        // Register capabilities
        this.server.registerCapabilities({ resources: {}, tools: {} });

        // List resources
        this.server.setRequestHandler(z.object({ method: z.literal('resources/list'), params: z.any().optional() }) as any, async () => {
            return {
                resources: [
                    { name: 'types', uri: 'pokemon://types' },
                    { name: 'list', uri: 'pokemon://list' },
                    { name: 'data', uri: 'pokemon://data/{name}' },
                    { name: 'stats', uri: 'pokemon://stats/{name}' },
                    { name: 'moves', uri: 'pokemon://moves/{name}' },
                ]
            } as any;
        });

        // Read resource
        this.server.setRequestHandler(z.object({ method: z.literal('resources/read'), params: z.any() }) as any, async (req: any) => {
            const url = new URL(req.params.uri);
            const type = url.host;
            const identifier = url.pathname.replace(/^\//, '');
            if (type === 'types') {
                return { contents: [{ uri: req.params.uri, mimeType: 'application/json', text: JSON.stringify(['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy']) }] } as any;
            }
            if (type === 'list') {
                const list = (await this.data.getAllPokemon(50)).map((p) => p.name);
                return { contents: [{ uri: req.params.uri, mimeType: 'application/json', text: JSON.stringify(list) }] } as any;
            }
            if (type === 'data') {
                const p = await this.data.getPokemon(identifier);
                return { contents: [{ uri: req.params.uri, mimeType: 'application/json', text: JSON.stringify(p) }] } as any;
            }
            if (type === 'stats') {
                const p = await this.data.getPokemon(identifier);
                return { contents: [{ uri: req.params.uri, mimeType: 'application/json', text: JSON.stringify(p.baseStats) }] } as any;
            }
            if (type === 'moves') {
                const p = await this.data.getPokemon(identifier);
                return { contents: [{ uri: req.params.uri, mimeType: 'application/json', text: JSON.stringify(p.moves) }] } as any;
            }
            throw new Error(`Unknown resource type: ${type}`);
        });

        // Tools list
        this.server.setRequestHandler(z.object({ method: z.literal('tools/list'), params: z.any().optional() }) as any, async () => {
            return {
                tools: [
                    {
                        name: 'simulate_battle',
                        description: 'Simulate a battle between two Pokémon',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                pokemon1: { type: 'string', description: 'Name or ID of first Pokémon' },
                                pokemon2: { type: 'string', description: 'Name or ID of second Pokémon' },
                                options: { type: 'object', properties: { level: { type: 'number' }, maxTurns: { type: 'number' }, seed: { type: ['string', 'number'] as any, description: 'Seed for deterministic RNG' } } },
                            },
                            required: ['pokemon1', 'pokemon2'],
                        },
                    },
                    {
                        name: 'natural_command',
                        description: 'Parse a human command like "battle pikachu vs charizard" or "stats bulbasaur" and execute it',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                command: { type: 'string', description: 'Human command about Pokémon' },
                            },
                            required: ['command'],
                        },
                    },
                ]
            } as any;
        });

        // Tools call
        this.server.setRequestHandler(z.object({ method: z.literal('tools/call'), params: z.any() }) as any, async (req: any) => {
            const toolName = req.params?.name;
            if (toolName === 'simulate_battle') {
                const { pokemon1, pokemon2, options } = req.params.arguments || {};
                const p1 = await this.data.getPokemon(pokemon1);
                const p2 = await this.data.getPokemon(pokemon2);
                const level = options?.level ?? 50;
                const maxTurns = options?.maxTurns ?? 300;
                const seed = options?.seed;
                const result = await this.engine.simulateBattle(p1, p2, maxTurns, level, seed);
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] } as any;
            }
            if (toolName === 'natural_command') {
                const { command } = req.params.arguments || {};
                const response = await this.handleNaturalCommand(String(command || ''));
                return { content: [{ type: 'text', text: response }] } as any;
            }
            throw new Error('Unknown tool');
        });
    }

    private async handleNaturalCommand(command: string): Promise<string> {
        const intent = await interpretCommand(command);
        if (intent.intent === 'battle') {
            const p1 = await this.data.getPokemon(intent.pokemon1);
            const p2 = await this.data.getPokemon(intent.pokemon2);
            const result = await this.engine.simulateBattle(p1, p2, 300, 50, undefined);
            return JSON.stringify(result, null, 2);
        }
        if (intent.intent === 'stats') {
            const p = await this.data.getPokemon(intent.name);
            return JSON.stringify(p.baseStats, null, 2);
        }
        if (intent.intent === 'moves') {
            const p = await this.data.getPokemon(intent.name);
            const count = intent.count && intent.count > 0 ? intent.count : p.moves.length;
            return JSON.stringify(p.moves.slice(0, count), null, 2);
        }
        if (intent.intent === 'types') {
            const types = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'];
            return JSON.stringify(types, null, 2);
        }
        if (intent.intent === 'info') {
            const p = await this.data.getPokemon(intent.name);
            return JSON.stringify(p, null, 2);
        }
        return 'Unrecognized command. Try: "battle pikachu vs charizard", "stats bulbasaur", or "moves charizard"';
    }

    async run() {
        // Resolve absolute path to stdio transport to dodge export-map differences
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const path = require('path');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const fs = require('fs');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pkgPath = require.resolve('@modelcontextprotocol/sdk/package.json');
        const base = path.dirname(pkgPath);
        const up1 = path.dirname(base);
        const up2 = path.dirname(up1);
        const candidates = [
            // When package.json is at dist/cjs or dist/esm
            path.join(base, 'server', 'stdio.js'),
            // When package.json is at dist/* level
            path.join(up1, 'cjs', 'server', 'stdio.js'),
            path.join(up1, 'esm', 'server', 'stdio.js'),
            // When package.json is at package root
            path.join(base, 'dist', 'cjs', 'server', 'stdio.js'),
            path.join(base, 'dist', 'esm', 'server', 'stdio.js'),
            // Fallbacks from one more level up
            path.join(up2, 'dist', 'cjs', 'server', 'stdio.js'),
            path.join(up2, 'dist', 'esm', 'server', 'stdio.js'),
        ];
        let TransportCtor: any = null;
        for (const p of candidates) {
            try {
                if (fs.existsSync(p)) {
                    // eslint-disable-next-line import/no-dynamic-require, global-require
                    const mod = require(p);
                    TransportCtor = mod.StdioServerTransport || mod.default || null;
                    if (TransportCtor) {
                        break;
                    }
                }
            } catch {
                // try next
            }
        }
        if (!TransportCtor) {
            throw new Error('Unable to locate StdioServerTransport in @modelcontextprotocol/sdk');
        }
        const transport: any = new TransportCtor();
        await (this.server as any).connect(transport);
        logger.info('Pokemon MCP Server is running (stdio)');
    }
}

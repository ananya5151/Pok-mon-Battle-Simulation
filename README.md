# Pokémon MCP: Data Resource + Battle Simulation

A real MCP stdio server that exposes rich Pokémon data as MCP resources and a deterministic battle simulator as an MCP tool. Built in TypeScript and wired for Claude Desktop on Windows.

## Start here: Claude Desktop (Windows) MCP connection

1) Build and start once to verify stdio

```powershell
npm install ; npm run build ; npm start
# Expect in the console (stderr): "Pokemon MCP Server is running (stdio)"
# Press Ctrl+C to stop after confirming
```

1) Auto-configure Claude Desktop

```powershell
npm run configure:claude
```

This writes `%APPDATA%\Claude\claude_desktop_config.json` pointing to your absolute Node path and `dist/index.js`.

1) Restart Claude Desktop and validate connection

- Ask: “List available tools” → expect `simulate_battle` and `natural_command`.
- Ask: “resources/list” or “What Pokémon resources do you expose?” → you should see `pokemon://types`, `pokemon://list`, `pokemon://data/{name}`, `pokemon://stats/{name}`, `pokemon://moves/{name}`.
- Optional: run a deterministic battle → “battle pikachu vs charizard seed 12345 level 50”.

If Claude shows a JSON parse error, rebuild (`npm run build`) and ensure the server printed the stdio banner above; logging is already routed to stderr to keep MCP stdout clean.

## Where is the MCP connection and logic in this repo?

- MCP stdio server and connection: `src/server.ts` (registers resources/tools; connects over stdio using a dynamic transport resolver), `src/index.ts` (starts the server)
- Part 1 (Data Resource): `src/data/pokemonData.ts` (PokeAPI + cache + evolution), `src/types/pokemon.ts` (schemas); resource URIs handled in `src/server.ts`
- Part 2 (Battle Tool): `src/battle/battleEngine.ts`, `src/battle/damageCalculator.ts`, `src/battle/typeEffectiveness.ts`, `src/battle/statusEffects.ts`
- Deterministic RNG + logging: `src/utils/rng.ts`, `src/utils/logger.ts` (stderr-only)
- Natural-language and CLI: `src/utils/llm.ts`, `src/cli.ts`
- Claude Desktop config helper (Windows/macOS/Linux aware): `scripts/configure-claude.js`

## At a glance

- Part 1 (Data Resource): Pokémon base stats, types, abilities, moves (with power/accuracy/type/PP/category and common status effects), and evolution info; exposed via `pokemon://...` MCP resources ready for LLMs.
- Part 2 (Battle Tool): Deterministic simulator with type effectiveness, physical/special damage, turn order by Speed, status effects (Paralysis, Burn, Poison, Sleep, Freeze, Confusion, Flinch), PP/accuracy, per-turn logs, and a clear winner; exposed via MCP tools.

---

## Install and run

```powershell
npm install ; npm run build ; npm start
```

Expected: the server prints to stderr

```text
[info] Pokemon MCP Server is running (stdio)
```

Stop with Ctrl+C.

Optional CLI (natural language):

```powershell
npm run build ; npm run cli -- "battle pikachu vs charizard" --level 50 --seed 12345 --maxTurns 200
```

---

## Part 1: Pokémon Data Resource

Design: An MCP resource namespace `pokemon://` that LLMs can browse and fetch. Implemented in `src/server.ts` with a `PokemonDataService` (`src/data/pokemonData.ts`) backed by PokeAPI and a local JSON cache at `data/pokemon-data-cache.json`.

What’s exposed

- Base stats: HP, Attack, Defense, Special Attack, Special Defense, Speed
- Types: full 18-type set
- Abilities: name, hidden flag (description is placeholder)
- Moves: up to 12 stronger/reliable moves with fields: name, type, category, power, accuracy, pp, effects (burn/poison/paralysis/sleep/freeze/confusion/flinch when available from move meta)
- Evolution: next evolution target and level (if present) via species → evolution chain

Resources

- `pokemon://types` → JSON array of all Pokémon types
- `pokemon://list` → JSON array of names (first 50 by default)
- `pokemon://data/{name}` → full Pokémon JSON (stats, types, abilities, moves, evolution, height/weight/species)
- `pokemon://stats/{name}` → base stats only
- `pokemon://moves/{name}` → selected move list only

MCP resource design patterns observed

- Deterministic URIs and stable schemas for LLMs
- `resources/list` enumerates the available “templates” and sample entries
- `resources/read` returns a single JSON payload (mimeType `application/json`)

Example LLM queries

- “Read pokemon://stats/pikachu to compare Speed.”
- “Read pokemon://moves/charizard and pick a strong special Fire move.”
- “Read pokemon://data/bulbasaur and summarize evolution info.”
- “Read pokemon://types and explain which beat Fire.”

Developer pointers

- Data service: `src/data/pokemonData.ts`
- Types: `src/types/pokemon.ts`
- Resource routing: in `src/server.ts` under `resources/list` and `resources/read`

Deliverables (Part 1)

- Source code for the MCP server and Pokémon resource: `src/server.ts`, `src/data/pokemonData.ts`, `src/types/*`
- Documentation (this README) describing the exposed data and URIs
- Query examples for LLM usage
<img width="750" alt="Screenshot 2025-09-11 044024" src="https://github.com/user-attachments/assets/977aec02-82c7-475e-bae5-83884d18d573" />
<img width="720" alt="Screenshot 2025-09-11 044220" src="https://github.com/user-attachments/assets/a645d018-f76a-4268-9723-8841357fd66d" />
<img width="740" alt="Screenshot 2025-09-11 044434" src="https://github.com/user-attachments/assets/8efb8b2d-8304-4909-b12c-549c1affe80e" />
<img width="740" alt="Screenshot 2025-09-11 044434" src="https://github.com/user-attachments/assets/a476b7eb-0d17-48e8-b36b-fe058d070240" />
<img width="760" alt="Screenshot 2025-09-11 044519" src="https://github.com/user-attachments/assets/5c117442-eb4a-42d7-9665-cfb5e37bada3" />

---

## Part 2: Battle Simulation Tool

Design: An MCP tool `simulate_battle` that accepts two Pokémon and optional options. Implemented with `BattleEngine` in `src/battle/battleEngine.ts` and exposed from `src/server.ts` via `tools/list` and `tools/call`.

<img width="750" height="1128" alt="Screenshot 2025-09-11 044615" src="https://github.com/user-attachments/assets/da09e628-7639-479c-8ca6-055b39547410" />
<img width="740" alt="Screenshot 2025-09-11 044708" src="https://github.com/user-attachments/assets/a299cb55-0d4d-4854-b8c5-66a17845cd55" />
<img width="720" alt="Screenshot 2025-09-11 044717" src="https://github.com/user-attachments/assets/65f1337a-3cbd-4eb9-9286-60fbdf5485ca" />
<img width="740" alt="Screenshot 2025-09-11 044801" src="https://github.com/user-attachments/assets/cc1c3cb3-d46c-4da6-be64-53e7fbfad21b" />
<img width="730" alt="Screenshot 2025-09-11 044809" src="https://github.com/user-attachments/assets/6562518b-7475-447c-be6f-372af04f4bed" />


Core mechanics

- Type effectiveness: full 18-type chart in `src/battle/typeEffectiveness.ts` and applied in damage
- Damage: physical/special split using move category, scaled by level; STAB included
- Turn order: fastest goes first (tie favors first Pokémon)
- Status effects: at least 3 implemented (we include Paralysis, Burn, Poison, plus Sleep, Freeze, Confusion, Flinch)
- Accuracy and PP: moves consume PP; misses are handled; struggle fallback when no PP
- Deterministic RNG: seeded PRNG for repeatable simulations; seed exposed in result
- Logs: per-turn, per-action messages plus a compact HP summary each turn

Tool schema

- Name: `simulate_battle`
- Input schema:
 	- `pokemon1`: string
 	- `pokemon2`: string
 	- `options` (optional):
  		- `level`: number (default 50)
  		- `maxTurns`: number (default 300)
  		- `seed`: string | number (for deterministic runs)

Output shape (JSON)

- `winner`: string | 'draw'
- `battleLog`: array of turns; each turn has actions and HP snapshot
- `turns`: total turns simulated
- `seed`: echoed seed used

Examples (LLM/tool calls)

- “Call simulate_battle with { pokemon1: 'pikachu', pokemon2: 'charizard', options: { level: 50, seed: 12345 } }.”
- “Natural: battle charizard vs blastoise level 70 seed 42 turns 200.”

Developer pointers

- Engine: `src/battle/battleEngine.ts`
- Damage: `src/battle/damageCalculator.ts`
- Status: `src/battle/statusEffects.ts`
- Tool exposure: `src/server.ts` under `tools/list` and `tools/call`

Deliverables (Part 2)

- Source code for the battle tool following MCP tool spec: `src/server.ts`, `src/battle/*`
- This README with dependency install, server start steps, and usage examples
- Clear instructions to set up and test locally and in Claude Desktop

---

## Claude Desktop (Windows) setup

1) Build and verify the server

```powershell
npm install ; npm run build ; npm start
# Expect in the console: "Pokemon MCP Server is running (stdio)"
```

1) Auto-configure Claude Desktop for MCP

```powershell
npm run configure:claude
```

This writes `%APPDATA%\Claude\claude_desktop_config.json` with an entry that points to your absolute Node path and `dist/index.js`.

1) Restart Claude Desktop and test

- Ask: “List available tools” — you should see `simulate_battle` and `natural_command`.
- Ask: “battle pikachu vs charizard seed 12345 level 50” — you’ll get deterministic results.
- Ask: “moves bulbasaur” or “stats squirtle”.

Troubleshooting

- If Claude reports “not valid JSON”, ensure all server logs go to stderr (already configured) and that you built with `npm run build`.
- If tools don’t appear, re-run `npm run configure:claude` and restart Claude.

---

## Project structure

```text
src/
 battle/                 # engine, damage, statuses, type chart
 data/                   # PokeAPI service with caching and evolution
 utils/                  # rng, logger, llm parsing
 server.ts               # MCP server (resources + tools)
 index.ts                # entry point
 cli.ts                  # optional CLI for natural commands
tests/                    # jest tests (TypeScript)
scripts/                  # Windows Claude config helper
```

## Run tests

```powershell
npm test
```

## Notes

- The server uses stderr for logs to keep MCP stdout pure.
- You can tune the engine’s move selection pool via `MOVE_POOL_SIZE` env var (default 8).
- Data is cached at `data/pokemon-data-cache.json` after first fetch.

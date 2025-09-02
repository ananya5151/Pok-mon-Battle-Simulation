// src/server.ts

import express from 'express';
import { getPokemonData } from './services/pokeapi.service';
import { simulateBattle } from './tool/battle.service';

// Initialize the Express application
const app = express();
const port = 3000; // The port our server will listen on

// Middleware to parse JSON bodies in incoming requests
app.use(express.json());

// --- Endpoint 1: Pokémon Data Resource ---
// This gives an LLM access to Pokémon data.
// Example Request: GET http://localhost:3000/resource/pokemon/snorlax
app.get('/resource/pokemon/:name', async (req, res) => {
  const pokemonName = req.params.name;
  console.log(`Resource request received for: ${pokemonName}`);

  const data = await getPokemonData(pokemonName);

  if (data) {
    res.json(data); // Send the Pokémon data back as JSON
  } else {
    res.status(404).json({ error: `Pokemon with name '${pokemonName}' not found.` });
  }
});

// --- Endpoint 2: Battle Simulation Tool ---
// This allows an LLM to simulate a battle.
// Example Request: POST http://localhost:3000/tool/battle-simulator
// Body: { "pokemon1": "venusaur", "pokemon2": "charizard" }
app.post('/tool/battle-simulator', async (req, res) => {
  const { pokemon1: name1, pokemon2: name2 } = req.body;
  console.log(`Tool request received for battle: ${name1} vs ${name2}`);

  if (!name1 || !name2) {
    return res.status(400).json({ error: 'Please provide names for both pokemon1 and pokemon2 in the request body.' });
  }

  const [p1Data, p2Data] = await Promise.all([
    getPokemonData(name1),
    getPokemonData(name2)
  ]);

  if (!p1Data || !p2Data) {
    return res.status(404).json({ error: 'Could not find data for one or both Pokémon.' });
  }

  const battleLog = simulateBattle(p1Data, p2Data);
  res.json({ battleLog }); // Send the battle log back as JSON
});

// Start the server and make it listen for requests
app.listen(port, () => {
  console.log(`🟢 MCP Server is running at http://localhost:${port}`);
  console.log('Test the data resource with: curl http://localhost:3000/resource/pokemon/pikachu');
  console.log('Test the battle tool with: curl -X POST -H "Content-Type: application/json" -d \'{"pokemon1":"mewtwo","pokemon2":"mew"}\' http://localhost:3000/tool/battle-simulator');
});
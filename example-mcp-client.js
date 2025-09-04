// example-mcp-client.js - Simple MCP client demonstration

const axios = require('axios');

class PokemonMCPClient {
  constructor(serverUrl = 'http://localhost:3000') {
    this.serverUrl = serverUrl;
    this.requestId = 1;
    this.initialized = false;
  }

  async makeRequest(method, params = null) {
    const payload = {
      jsonrpc: "2.0",
      method: method,
      id: this.requestId++
    };
    
    if (params) {
      payload.params = params;
    }

    try {
      const response = await axios.post(`${this.serverUrl}/mcp/${method.replace('.', '/')}`, payload);
      return response.data;
    } catch (error) {
      console.error(`MCP Request failed:`, error.response?.data || error.message);
      return null;
    }
  }

  async initialize() {
    console.log('🔌 Initializing MCP connection...');
    const response = await this.makeRequest('initialize');
    
    if (response && response.result) {
      this.initialized = true;
      console.log('✅ MCP connection initialized');
      console.log(`📋 Server: ${response.result.serverInfo.name} v${response.result.serverInfo.version}`);
      return true;
    }
    
    console.error('❌ Failed to initialize MCP connection');
    return false;
  }

  async listResources() {
    if (!this.initialized) {
      console.error('❌ MCP not initialized');
      return [];
    }

    const response = await this.makeRequest('resources.list');
    return response?.result?.resources || [];
  }

  async getPokemonData(pokemonName) {
    if (!this.initialized) {
      console.error('❌ MCP not initialized');
      return null;
    }

    const uri = `pokemon://data/${pokemonName.toLowerCase()}`;
    const response = await this.makeRequest('resources.read', { uri });
    
    if (response?.result?.contents?.[0]) {
      return JSON.parse(response.result.contents[0].text);
    }
    
    return null;
  }

  async listTools() {
    if (!this.initialized) {
      console.error('❌ MCP not initialized');
      return [];
    }

    const response = await this.makeRequest('tools.list');
    return response?.result?.tools || [];
  }

  async simulateBattle(pokemon1, pokemon2) {
    if (!this.initialized) {
      console.error('❌ MCP not initialized');
      return null;
    }

    const response = await this.makeRequest('tools.call', {
      name: 'battle_simulator',
      arguments: {
        pokemon1: pokemon1.toLowerCase(),
        pokemon2: pokemon2.toLowerCase()
      }
    });

    if (response?.result?.content?.[0]) {
      return response.result.content[0].text;
    }

    return null;
  }
}

// Example usage
async function demonstrateMCPClient() {
  const client = new PokemonMCPClient();

  // Initialize the connection
  const initialized = await client.initialize();
  if (!initialized) {
    process.exit(1);
  }

  console.log('\n📋 Available Resources:');
  const resources = await client.listResources();
  resources.forEach(resource => {
    console.log(`  - ${resource.name}: ${resource.description}`);
  });

  console.log('\n🔧 Available Tools:');
  const tools = await client.listTools();
  tools.forEach(tool => {
    console.log(`  - ${tool.name}: ${tool.description}`);
  });

  console.log('\n📊 Getting Pikachu data...');
  const pikachuData = await client.getPokemonData('pikachu');
  if (pikachuData) {
    console.log(`✅ Found ${pikachuData.name} (Type: ${pikachuData.types.join('/')}, HP: ${pikachuData.stats.hp})`);
  }

  console.log('\n⚔️ Simulating battle: Charizard vs Blastoise...');
  const battleResult = await client.simulateBattle('charizard', 'blastoise');
  if (battleResult) {
    console.log('🏆 Battle completed!');
    console.log(battleResult.substring(0, 300) + '...');
  }

  console.log('\n✨ MCP client demonstration complete!');
}

// Run the demonstration
if (require.main === module) {
  demonstrateMCPClient().catch(console.error);
}

module.exports = { PokemonMCPClient };
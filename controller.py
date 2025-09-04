# controller.py - MCP-Compatible Version

import ollama
import requests
import json
from typing import Dict, Any, Optional, List

# Configuration
MCP_SERVER_URL = "http://localhost:3000"
LOCAL_MODEL_NAME = 'llama3:8b-instruct-q4_0'

class MCPClient:
    """A simple MCP client that communicates with our Pokemon MCP server"""
    
    def __init__(self, server_url: str):
        self.server_url = server_url
        self.initialized = False
        self.request_id = 1
    
    def _make_request(self, method: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        """Make an MCP JSON-RPC request"""
        payload = {
            "jsonrpc": "2.0",
            "method": method,
            "id": self.request_id
        }
        
        if params:
            payload["params"] = params
            
        self.request_id += 1
        
        response = requests.post(f"{self.server_url}/mcp/{method.replace('.', '/')}", json=payload)
        return response.json()
    
    def initialize(self) -> bool:
        """Initialize the MCP connection"""
        try:
            result = self._make_request("initialize")
            if "result" in result:
                self.initialized = True
                print("🔌 MCP connection initialized successfully")
                return True
            else:
                print(f"❌ MCP initialization failed: {result.get('error', {}).get('message', 'Unknown error')}")
                return False
        except Exception as e:
            print(f"❌ Failed to initialize MCP connection: {e}")
            return False
    
    def list_resources(self) -> List[Dict]:
        """List available MCP resources"""
        if not self.initialized:
            return []
            
        try:
            result = self._make_request("resources.list")
            if "result" in result:
                return result["result"].get("resources", [])
            return []
        except Exception as e:
            print(f"❌ Error listing resources: {e}")
            return []
    
    def read_resource(self, uri: str) -> Optional[Dict]:
        """Read a specific MCP resource"""
        if not self.initialized:
            return None
            
        try:
            result = self._make_request("resources.read", {"uri": uri})
            if "result" in result:
                contents = result["result"].get("contents", [])
                if contents:
                    # Parse the JSON text content
                    return json.loads(contents[0]["text"])
            elif "error" in result:
                print(f"❌ Resource error: {result['error']['message']}")
            return None
        except Exception as e:
            print(f"❌ Error reading resource: {e}")
            return None
    
    def list_tools(self) -> List[Dict]:
        """List available MCP tools"""
        if not self.initialized:
            return []
            
        try:
            result = self._make_request("tools.list")
            if "result" in result:
                return result["result"].get("tools", [])
            return []
        except Exception as e:
            print(f"❌ Error listing tools: {e}")
            return []
    
    def call_tool(self, name: str, arguments: Dict) -> Optional[str]:
        """Call an MCP tool"""
        if not self.initialized:
            return None
            
        try:
            result = self._make_request("tools.call", {"name": name, "arguments": arguments})
            if "result" in result:
                content = result["result"].get("content", [])
                if content:
                    return content[0]["text"]
            elif "error" in result:
                print(f"❌ Tool error: {result['error']['message']}")
            return None
        except Exception as e:
            print(f"❌ Error calling tool: {e}")
            return None

# Enhanced system prompt for MCP operations
SYSTEM_PROMPT = """
You are an expert Pokémon assistant with access to MCP (Model Context Protocol) resources and tools.

Available operations:
1. `get_pokemon_data`: Get detailed information about a single Pokémon
   - Format: {"operation": "get_pokemon_data", "pokemon_name": "pokemon_name"}
   
2. `simulate_battle`: Simulate a battle between two Pokémon
   - Format: {"operation": "simulate_battle", "pokemon1": "pokemon_one_name", "pokemon2": "pokemon_two_name"}

Based on the user's request, respond with ONLY a JSON object containing the operation and required parameters.
"""

def ask_local_model_for_command(user_prompt: str) -> Optional[Dict]:
    """Ask the local model to interpret the user's command"""
    print(f"🧠 Asking local model ({LOCAL_MODEL_NAME}) to interpret the command...")
    try:
        response = ollama.chat(
            model=LOCAL_MODEL_NAME,
            messages=[
                {'role': 'system', 'content': SYSTEM_PROMPT},
                {'role': 'user', 'content': user_prompt},
            ],
            options={'temperature': 0}
        )
        json_command_str = response['message']['content']
        return json.loads(json_command_str)
    except Exception as e:
        print(f"Error communicating with local model: {e}")
        return None

def execute_mcp_command(mcp_client: MCPClient, command: Dict) -> Optional[str]:
    """Execute the command using MCP protocol"""
    operation = command.get("operation")
    print(f"⚙️ Executing MCP operation: {operation}")
    
    if operation == "get_pokemon_data":
        pokemon_name = command.get("pokemon_name")
        if not pokemon_name:
            return "Error: Pokemon name is required"
            
        # Use MCP resource to get Pokemon data
        uri = f"pokemon://data/{pokemon_name.lower()}"
        pokemon_data = mcp_client.read_resource(uri)
        
        if pokemon_data:
            return format_pokemon_data(pokemon_data)
        else:
            return f"Could not find data for Pokemon: {pokemon_name}"
    
    elif operation == "simulate_battle":
        pokemon1 = command.get("pokemon1")
        pokemon2 = command.get("pokemon2")
        
        if not pokemon1 or not pokemon2:
            return "Error: Both pokemon1 and pokemon2 are required"
        
        # Use MCP tool to simulate battle
        battle_result = mcp_client.call_tool("battle_simulator", {
            "pokemon1": pokemon1.lower(),
            "pokemon2": pokemon2.lower()
        })
        
        if battle_result:
            return f"\n--- Battle Report ---\n{battle_result}"
        else:
            return f"Could not simulate battle between {pokemon1} and {pokemon2}"
    
    else:
        return f"Unknown operation: {operation}"

def format_pokemon_data(pokemon: Dict) -> str:
    """Format Pokemon data for display"""
    name = pokemon['name'].capitalize()
    types = " and ".join(pokemon['types']).capitalize()
    
    result = f"\n--- Pokémon Profile ---\n"
    result += f"Name: {name}\n"
    result += f"Type: {types}\n"
    result += f"HP: {pokemon['stats']['hp']}\n"
    result += f"Attack: {pokemon['stats']['attack']}\n"
    result += f"Defense: {pokemon['stats']['defense']}\n"
    result += f"Special Attack: {pokemon['stats']['specialAttack']}\n"
    result += f"Special Defense: {pokemon['stats']['specialDefense']}\n"
    result += f"Speed: {pokemon['stats']['speed']}\n"
    result += f"Abilities: {', '.join(pokemon['abilities'])}\n"
    
    evolution = pokemon.get('evolution', {})
    if evolution.get('evolvesTo'):
        evolutions = ", ".join(evolution['evolvesTo']).capitalize()
        result += f"Evolves to: {evolutions}\n"
    else:
        result += "This is the final form in its evolution chain.\n"
    
    return result

def main():
    """Main application loop"""
    # Initialize MCP client
    mcp_client = MCPClient(MCP_SERVER_URL)
    
    if not mcp_client.initialize():
        print("❌ Failed to initialize MCP connection. Make sure the server is running.")
        return
    
    # Show available resources and tools
    print("\n📋 Available MCP Resources:")
    resources = mcp_client.list_resources()
    for resource in resources:
        print(f"  - {resource['name']}: {resource.get('description', 'No description')}")
    
    print("\n🔧 Available MCP Tools:")
    tools = mcp_client.list_tools()
    for tool in tools:
        print(f"  - {tool['name']}: {tool.get('description', 'No description')}")
    
    print(f"\n✅ Pokémon MCP Controller is ready! Type your command or 'exit' to quit.")
    print("Example commands:")
    print("  - 'who is snorlax' or 'tell me about pikachu'")
    print("  - 'battle charizard and blastoise' or 'charizard vs blastoise'")
    print("  - 'what are mewtwo stats' or 'eevee evolution info'")
    
    while True:
        try:
            user_input = input("\n> ").strip()
            if user_input.lower() == 'exit':
                break
            
            if not user_input:
                continue
                
            # Get command from local model (with fallback parsing)
            command = ask_local_model_for_command(user_input)
            
            if command:
                print(f"📝 Parsed command: {command}")
                # Execute using MCP
                result = execute_mcp_command(mcp_client, command)
                if result:
                    print(result)
                else:
                    print("❌ No result returned from MCP operation")
            else:
                print("❌ Could not understand the command. Please try:")
                print("   For Pokemon info: 'who is [pokemon]' or 'tell me about [pokemon]'")
                print("   For battles: 'battle [pokemon1] and [pokemon2]' or '[pokemon1] vs [pokemon2]'")
                
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"❌ Error: {e}")
    
    print("\n👋 Goodbye!")

if __name__ == "__main__":
    main()
import requests
import json
from typing import Dict, Any, Optional, List
import re
import random

# Configuration
MCP_SERVER_URL = "http://localhost:3000"

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
        response.raise_for_status() # Raise an exception for bad status codes
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
        if not self.initialized: return []
        try:
            result = self._make_request("resources.list")
            return result["result"].get("resources", [])
        except Exception as e:
            print(f"❌ Error listing resources: {e}")
            return []
    
    def read_resource(self, uri: str) -> Optional[str]:
        """Read a specific MCP resource (returns raw text)"""
        if not self.initialized: return None
        try:
            result = self._make_request("resources.read", {"uri": uri})
            if "result" in result:
                return result["result"].get("contents", [{}])[0].get("text")
            elif "error" in result:
                print(f"❌ Resource error: {result['error']['message']}")
            return None
        except Exception as e:
            print(f"❌ Error reading resource: {e}")
            return None
    
    def list_tools(self) -> List[Dict]:
        """List available MCP tools"""
        if not self.initialized: return []
        try:
            result = self._make_request("tools.list")
            return result["result"].get("tools", [])
        except Exception as e:
            print(f"❌ Error listing tools: {e}")
            return []
    
    def call_tool(self, name: str, arguments: Dict) -> Optional[str]:
        """Call an MCP tool"""
        if not self.initialized: return None
        try:
            result = self._make_request("tools.call", {"name": name, "arguments": arguments})
            if "result" in result:
                return result["result"].get("content", [{}])[0].get("text")
            elif "error" in result:
                print(f"❌ Tool error: {result['error']['message']}")
            return None
        except Exception as e:
            print(f"❌ Error calling tool: {e}")
            return None

class ClaudeCommandParser:
    """Parse user commands using intent keywords and scoring"""
    def __init__(self):
        self.info_keywords = ['info', 'stats', 'about', 'who is', 'tell me', 'show']
        self.battle_keywords = ['battle', 'fight', 'vs', 'versus', 'simulate', 'who would win']
        self.moves_keywords = ['moves', 'can learn', 'learn', 'list moves', 'show moves']
        self.type_keywords = ['effective', 'weak', 'weakness', 'resist', 'type']

    def parse_command(self, user_input: str) -> Optional[Dict]:
        user_input_lower = user_input.lower().strip()
        words = re.split(r'\s|vs|versus', user_input_lower)
        words = [w.strip(".,?!") for w in words if w]

        scores = {
            "info": sum(1 for keyword in self.info_keywords if keyword in user_input_lower),
            "battle": sum(1 for keyword in self.battle_keywords if keyword in user_input_lower),
            "moves": sum(1 for keyword in self.moves_keywords if keyword in user_input_lower),
            "type": sum(1 for keyword in self.type_keywords if keyword in user_input_lower)
        }
        
        expanded_stops = ['and','between','the','a','an','to','for','with','vs','versus','that', 'tell','me','about','who','is','would','win','simulate','fight','battle', 'list','show','moves','can','learn','effective','weak','weakness','resist','type','super','not','very','against','what','are']
        all_keywords = set(self.info_keywords + self.battle_keywords + self.moves_keywords + self.type_keywords + expanded_stops)
        pokemon_names = [word for word in words if word not in all_keywords and len(word) > 2]

        limit_match = re.search(r"\d+", user_input_lower)
        limit = int(limit_match.group(0)) if limit_match else None

        highest_intent = max(scores, key=scores.get) if any(s > 0 for s in scores.values()) else None

        if highest_intent == "battle" and len(pokemon_names) >= 2:
            return {"operation": "simulate_battle", "pokemon1": pokemon_names[0], "pokemon2": pokemon_names[1]}
        if highest_intent == "moves" and len(pokemon_names) >= 1:
            return {"operation": "list_moves", "pokemon_name": pokemon_names[0], "limit": limit}
        # *** FIX #1: This now points to the correct operation and extracts the right parameter. ***
        if highest_intent == "type" and len(pokemon_names) >= 1:
            return {"operation": "get_type_weakness", "pokemon_name": pokemon_names[0]}
        if highest_intent == "info" and len(pokemon_names) >= 1:
            return {"operation": "get_pokemon_data", "pokemon_name": pokemon_names[0]}
        
        if len(pokemon_names) == 1 and not highest_intent:
            return {"operation": "get_pokemon_data", "pokemon_name": pokemon_names[0]}

        return None

def execute_mcp_command(mcp_client: MCPClient, command: Dict) -> Optional[str]:
    """Execute the command using MCP protocol"""
    operation = command.get("operation")
    print(f"⚙️ Executing MCP operation: {operation}")
    
    if operation == "get_pokemon_data":
        pokemon_name = command.get("pokemon_name")
        if not pokemon_name: return "Error: Pokemon name is required"
        uri = f"pokemon://data/{pokemon_name.lower()}"
        return mcp_client.read_resource(uri) or f"Could not find data for Pokemon: {pokemon_name}"

    elif operation == "simulate_battle":
        pokemon1, pokemon2 = command.get("pokemon1"), command.get("pokemon2")
        if not pokemon1 or not pokemon2: return "Error: Both pokemon1 and pokemon2 are required"
        result = mcp_client.call_tool("battle_simulator", {"pokemon1": pokemon1, "pokemon2": pokemon2})
        return f"\n--- Battle Report ---\n{result}" if result else "Could not simulate battle"

    elif operation == "list_moves":
        pokemon_name, limit = command.get("pokemon_name"), command.get("limit")
        if not pokemon_name: return "Error: Pokemon name is required"
        args = {"name": pokemon_name}
        if isinstance(limit, int): args["limit"] = limit
        return mcp_client.call_tool("list_moves", args) or f"Could not list moves for {pokemon_name}"

    # *** FIX #2: This now calls the correct tool name on the server. ***
    elif operation == "get_type_weakness":
        pokemon_name = command.get("pokemon_name")
        if not pokemon_name: return "Error: Pokemon name is required for weakness check"
        return mcp_client.call_tool("get_type_weakness", {"name": pokemon_name}) or f"Could not get type weakness for {pokemon_name}"

    else:
        return f"Unknown operation: {operation}"

def show_help():
    """Display help message with examples in a game-like style"""
    print(f"\n🎓 Professor Oak's Pokémon Research Guide")
    print(f"{'='*50}")
    print(f"\nHere's what I can do:\n")
    
    print(f"🔍 POKÉMON RESEARCH:")
    print(f"   • 'who is snorlax?' - Learn about a Pokémon.")
    print(f"   • 'charizard stats' - See a specific Pokémon's power.")
    # *** FIX #3: Added help text for the new command. ***
    print(f"   • 'what is gyarados weak to?' - Analyze type defenses.")

    print(f"\n⚔️ POKÉMON BATTLES:")
    print(f"   • 'battle charizard and blastoise' - Simulate a battle.")
    print(f"   • 'list 10 moves for pikachu' - See a Pokémon's moves.")
    
    print(f"\n🎮 SPECIAL COMMANDS:")
    print(f"   • 'help' or 'h' - Show this guide again")
    print(f"   • 'exit' - End your research session")
    print(f"\n{'='*50}")

def get_random_encouragement():
    """Get random encouraging messages like in Pokemon games"""
    messages = ["Keep up the great research, trainer! 🌟", "Your curiosity about Pokémon is admirable! 📚", "Every trainer needs to know their Pokémon well! 💪", "Excellent question! Knowledge is power in battles! ⚡", "You're becoming quite the Pokémon expert! 🎓"]
    return random.choice(messages)

def main():
    """Main application loop with game-like personality"""
    print(f"\n🎮 Welcome to Professor Oak's Pokémon Research Lab!")
    print(f"{'='*55}")
    print(f"🎓 Greetings, young trainer! I'm Professor Oak!")
    print(f"✨ Today we'll explore my advanced MCP-powered Pokédex and battle simulator.\n")
    
    print("🔌 Connecting to my research database...")
    mcp_client = MCPClient(MCP_SERVER_URL)
    
    if not mcp_client.initialize():
        print("❌ Oh dear! My research database seems to be offline.")
        print("   Please make sure the MCP server is running: npx ts-node src/server.ts")
        return
    
    print("\n📡 Research Database Status:")
    tools = mcp_client.list_tools()
    for tool in tools:
        print(f"   ✅ {tool['name']}: Operational!")
    
    parser = ClaudeCommandParser()
    
    print(f"\n🌟 Everything is ready! What would you like to research? (Type 'help' for guidance)")
    
    question_count = 0
    while True:
        try:
            user_input = input(f"\n🎓 Professor Oak> ").strip()
            
            if user_input.lower() == 'exit':
                print(f"\n🌅 Thank you for visiting my lab! Come back anytime! 👋")
                break
            elif user_input.lower() in ['help', 'h', '?']:
                show_help()
                continue
            elif not user_input:
                continue
            
            question_count += 1
            command = parser.parse_command(user_input)
            
            if command:
                result = execute_mcp_command(mcp_client, command)
                if result:
                    print(result)
                    if question_count % 3 == 0: print(f"\n💬 {get_random_encouragement()}")
                else:
                    print("😅 Hmm, something went wrong with my research equipment.")
            else:
                print("🤔 I'm not quite sure what you're asking about! (Type 'help' for examples)")
                
        except KeyboardInterrupt:
            print(f"\n\n🌅 Oh! Leaving so soon? Farewell! 👋")
            break
        except Exception as e:
            print(f"😅 Oops! Something unexpected happened in my lab: {e}")

if __name__ == "__main__":
    main()
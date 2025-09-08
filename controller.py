import requests
import json
from typing import Dict, Any, Optional, List
import re

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
    
    def read_resource(self, uri: str) -> Optional[str]:
        """Read a specific MCP resource (returns raw text)"""
        if not self.initialized:
            return None
            
        try:
            result = self._make_request("resources.read", {"uri": uri})
            if "result" in result:
                contents = result["result"].get("contents", [])
                if contents:
                    return contents[0]["text"]
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

class ClaudeCommandParser:
    """Parse user commands using intent keywords and scoring"""

    def __init__(self):
        # Keywords are more flexible than rigid patterns
        self.info_keywords = ['info', 'stats', 'about', 'who is', 'tell me', 'show']
        self.battle_keywords = ['battle', 'fight', 'vs', 'versus', 'simulate', 'who would win']
        self.moves_keywords = ['moves', 'can learn', 'learn', 'list moves', 'show moves']
        self.type_keywords = ['effective', 'weak', 'weakness', 'resist', 'type', 'super effective', 'not very effective']

    def parse_command(self, user_input: str) -> Optional[Dict]:
        """Parse user input by identifying keywords and extracting Pokémon names."""
        user_input_lower = user_input.lower().strip()
        words = re.split(r'\s|vs|versus', user_input_lower) # Split by space or vs
        words = [w.strip(".,?!") for w in words if w] # Clean up words

        # --- Intent Scoring ---
        info_score = sum(1 for keyword in self.info_keywords if keyword in user_input_lower)
        battle_score = sum(1 for keyword in self.battle_keywords if keyword in user_input_lower)
        moves_score = sum(1 for keyword in self.moves_keywords if keyword in user_input_lower)
        type_score = sum(1 for keyword in self.type_keywords if keyword in user_input_lower)

        # --- Identify Pokémon Names ---
        expanded_stops = ['and','between','the','a','an','to','for','with','vs','versus','that',
                          'tell','me','about','who','is','would','win','simulate','fight','battle',
                          'list','show','moves','can','learn','effective','weak','weakness','resist','type','super','not','very','against','what','are']
        split_keywords = []
        for kw in (self.info_keywords + self.battle_keywords + self.moves_keywords + self.type_keywords):
            split_keywords.extend(kw.split())
        all_keywords = set(self.info_keywords + self.battle_keywords + self.moves_keywords + self.type_keywords + split_keywords + expanded_stops)

        pokemon_names = [
            word for word in words
            if word not in all_keywords and len(word) > 2
        ]

        # Extract optional numeric limit (e.g., "list 10 moves")
        limit = None
        m = re.search(r"list\s+(\d+)", user_input_lower)
        if m:
            try:
                limit = int(m.group(1))
            except:
                limit = None

        # --- Decide Operation ---
        if battle_score > 0 and len(pokemon_names) >= 2:
            return {"operation": "simulate_battle", "pokemon1": pokemon_names[0], "pokemon2": pokemon_names[1]}
        if moves_score > 0 and len(pokemon_names) >= 1:
            # Prefer the last meaningful token (handles phrases like 'moves that X can learn')
            pokemon = pokemon_names[-1]
            return {"operation": "list_moves", "pokemon_name": pokemon, "limit": limit}
        if info_score > 0 and len(pokemon_names) >= 1:
            return {"operation": "get_pokemon_data", "pokemon_name": pokemon_names[0]}
        if type_score > 0:
            # Try to extract types appearing after 'against' or in the query
            types_found = [w for w in words if w not in all_keywords and len(w) > 2]
            if len(types_found) >= 1:
                # default to same attacking/defending type if only one provided
                attacking = types_found[0]
                defending = types_found[1:2] if len(types_found) > 1 else [types_found[0]]
                return {"operation": "type_effectiveness", "attacking_type": attacking, "defending_types": defending}

        # Fallback for simple name queries like "pikachu"
        if len(pokemon_names) == 1 and battle_score == 0 and info_score == 0 and moves_score == 0 and type_score == 0:
            return {"operation": "get_pokemon_data", "pokemon_name": pokemon_names[0]}

        return None

def execute_mcp_command(mcp_client: MCPClient, command: Dict) -> Optional[str]:
    """Execute the command using MCP protocol"""
    operation = command.get("operation")
    print(f"⚙️ Executing MCP operation: {operation}")
    
    if operation == "get_pokemon_data":
        pokemon_name = command.get("pokemon_name")
        if not pokemon_name:
            return "Error: Pokemon name is required"
        uri = f"pokemon://data/{pokemon_name.lower()}"
        text = mcp_client.read_resource(uri)
        return text or f"Could not find data for Pokemon: {pokemon_name}"

    elif operation == "simulate_battle":
        pokemon1 = command.get("pokemon1")
        pokemon2 = command.get("pokemon2")
        if not pokemon1 or not pokemon2:
            return "Error: Both pokemon1 and pokemon2 are required"
        battle_result = mcp_client.call_tool("battle_simulator", {"pokemon1": pokemon1.lower(), "pokemon2": pokemon2.lower()})
        return f"\n--- Battle Report ---\n{battle_result}" if battle_result else f"Could not simulate battle between {pokemon1} and {pokemon2}"

    elif operation == "list_moves":
        pokemon_name = command.get("pokemon_name")
        limit = command.get("limit")
        if not pokemon_name:
            return "Error: Pokemon name is required"
        args = {"name": pokemon_name.lower()}
        if isinstance(limit, int) and limit > 0:
            args["limit"] = limit
        result = mcp_client.call_tool("list_moves", args)
        return result or f"Could not list moves for {pokemon_name}"

    elif operation == "type_effectiveness":
        attacking = command.get("attacking_type")
        defending = command.get("defending_types") or []
        if not attacking or not defending:
            return "Error: Need attacking_type and at least one defending type"
        result = mcp_client.call_tool("get_type_effectiveness", {"attacking_type": attacking, "defending_types": defending})
        return result or "Could not compute type effectiveness"

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

def show_help():
    """Display help message with examples in a game-like style"""
    print(f"\n🎓 Professor Oak's Pokémon Research Guide")
    print(f"{'='*50}")
    print(f"\nWelcome, young trainer! I'm here to help you learn about")
    print(f"the wonderful world of Pokémon! Here's what I can do:\n")
    
    print(f"🔍 POKÉMON RESEARCH:")
    print(f"   Ask me about any Pokémon and I'll share what I know!")
    print(f"   Try saying:")
    print(f"   • 'Who is Snorlax?' - Learn about this sleepy giant!")
    print(f"   • 'Tell me about Pikachu' - Discover the electric mouse!")
    print(f"   • 'Charizard stats' - See this fire-type's power!")
    print(f"   • 'What is Mewtwo?' - Uncover legendary secrets!")
    print(f"   • 'Show Eevee info' - Explore evolution possibilities!")
    
    print(f"\n⚔️ POKÉMON BATTLES:")
    print(f"   Watch epic battles unfold before your eyes!")
    print(f"   Command the arena with:")
    print(f"   • 'Battle Charizard and Blastoise' - Classic rivalry!")
    print(f"   • 'Pikachu vs Raichu' - Evolution showdown!")
    print(f"   • 'Fight Gengar against Alakazam' - Psychic clash!")
    print(f"   • 'Simulate Dragonite vs Tyranitar' - Legendary battle!")
    
    print(f"\n🎮 SPECIAL COMMANDS:")
    print(f"   • 'help' or 'h' - Show this guide again")
    print(f"   • 'exit' - End your research session")
    
    print(f"\n💡 Professor's Tip:")
    print(f"   I understand natural language! Just talk to me like you")
    print(f"   would ask a friend about Pokémon. I'm quite smart! 😊")
    print(f"\n{'='*50}")

def get_random_encouragement():
    """Get random encouraging messages like in Pokemon games"""
    messages = [
        "Keep up the great research, trainer! 🌟",
        "Your curiosity about Pokémon is admirable! 📚",
        "Every trainer needs to know their Pokémon well! 💪",
        "Excellent question! Knowledge is power in battles! ⚡",
        "You're becoming quite the Pokémon expert! 🎓",
        "That's the spirit of a true researcher! 🔬",
        "Your dedication to learning is impressive! 🏆",
        "Another great discovery in your Pokédex! 📖"
    ]
    import random
    return random.choice(messages)

def main():
    """Main application loop with game-like personality"""
    print(f"\n🎮 Welcome to Professor Oak's Pokémon Research Lab!")
    print(f"{'='*55}")
    print(f"🎓 Greetings, young trainer! I'm Professor Oak!")
    print(f"📚 I've spent my life studying these wonderful creatures")
    print(f"   called Pokémon, and I'm here to share that knowledge")
    print(f"   with aspiring trainers like yourself!")
    print(f"\n✨ Today we'll explore my advanced MCP-powered Pokédex")
    print(f"   and battle simulator. No external AI needed - just")
    print(f"   pure Pokémon knowledge and excitement!\n")
    
    # Initialize MCP client
    print("🔌 Connecting to my research database...")
    mcp_client = MCPClient(MCP_SERVER_URL)
    
    if not mcp_client.initialize():
        print("❌ Oh dear! My research database seems to be offline.")
        print("   Please make sure the MCP server is running!")
        print("   In another terminal, run: npx ts-node src/server.ts")
        print("   Then come back and we can continue your research! 🔬")
        return
    
    # Show available resources and tools
    print("\n📡 Research Database Status:")
    resources = mcp_client.list_resources()
    for resource in resources:
        print(f"   ✅ {resource['name']}: Ready for research!")
    
    tools = mcp_client.list_tools()
    for tool in tools:
        print(f"   ⚔️ {tool['name']}: Battle arena operational!")
    
    # Initialize command parser
    parser = ClaudeCommandParser()
    
    print(f"\n🌟 Everything is ready! What would you like to research?")
    print(f"   Type 'help' if you need guidance, or just ask me about")
    print(f"   any Pokémon that interests you!")
    
    question_count = 0
    
    while True:
        try:
            user_input = input(f"\n🎓 Professor Oak> ").strip()
            
            if user_input.lower() == 'exit':
                print(f"\n🌅 Thank you for visiting my lab, trainer!")
                print(f"   Keep exploring the world of Pokémon, and remember:")
                print(f"   knowledge and kindness towards Pokémon will make")
                print(f"   you a truly great trainer! 🌟")
                print(f"\n   Come back anytime for more research! Farewell! 👋")
                break
            elif user_input.lower() in ['help', 'h', '?']:
                show_help()
                continue
            elif not user_input:
                print("🤔 Hmm? Did you want to ask me something?")
                continue
            
            question_count += 1
            
            # Parse the command using our parser
            command = parser.parse_command(user_input)
            
            if command:
                # Execute using MCP
                result = execute_mcp_command(mcp_client, command)
                if result:
                    print(result)
                    if question_count % 3 == 0:  # Every 3 questions
                        print(f"\n💬 {get_random_encouragement()}")
                else:
                    print("😅 Hmm, something went wrong with my research equipment.")
                    print("   Could you try asking again?")
            else:
                print("🤔 I'm not quite sure what you're asking about!")
                print("   Try asking about a specific Pokémon or setting up a battle.")
                print("   For example: 'Who is Pikachu?' or 'Battle Charizard vs Blastoise'")
                print(f"\n💡 Type 'help' if you'd like to see more examples!")
                
        except KeyboardInterrupt:
            print(f"\n\n🌅 Oh! Leaving so soon?")
            print(f"   Well, thank you for visiting my lab! Come back anytime! 👋")
            break
        except Exception as e:
            print(f"😅 Oops! Something unexpected happened in my lab: {e}")
            print(f"   Don't worry, let's keep going! Ask me anything else!")

if __name__ == "__main__":
    main()
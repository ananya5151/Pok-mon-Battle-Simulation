# terminal_client.py
import subprocess
import json
import os
import sys
import threading
import requests
import asyncio
from queue import Queue, Empty

# --- GLOBAL KNOWLEDGE BASE ---
POKEMON_NAMES = set()
KNOWN_TYPES = {
    'normal', 'fire', 'water', 'grass', 'electric', 'ice', 'fighting', 'poison',
    'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark',
    'steel', 'fairy'
}

def initialize_pokemon_knowledge_base():
    """Fetches a list of all Pokémon from PokeAPI."""
    print("🧠 Building Pokémon knowledge base (one-time setup)...")
    try:
        response = requests.get("https://pokeapi.co/api/v2/pokemon?limit=1302", timeout=10)
        response.raise_for_status()
        data = response.json()
        global POKEMON_NAMES
        POKEMON_NAMES = {p['name'] for p in data['results']}
        POKEMON_NAMES.add("mr-mime") # Add manual exceptions
        print(f"✅ Knowledge base ready! Loaded {len(POKEMON_NAMES)} Pokémon names.")
    except requests.exceptions.RequestException as e:
        print(f"❌ Error building knowledge base: {e}. NLP will be limited.")

def server_output_reader(pipe, queue):
    """Reads lines from the server's stdout and puts them in a queue."""
    for line in iter(pipe.readline, ''):
        queue.put(line)
    pipe.close()

def extract_entities(words):
    """Extracts known Pokémon and Type names from a list of words."""
    found_pokemon = [word for word in words if word.strip(".,!?()").lower() in POKEMON_NAMES]
    found_types = [word for word in words if word.strip(".,!?()").lower() in KNOWN_TYPES]
    return found_pokemon, found_types

# --- NEW: Asynchronous Helper for Sending Requests ---
async def send_request(process, queue, request):
    """Sends a request to the server and returns the response."""
    process.stdin.write(json.dumps(request) + '\n')
    process.stdin.flush()
    while True:
        try:
            response_line = queue.get_nowait()
            return json.loads(response_line)
        except Empty:
            await asyncio.sleep(0.1)

# --- NEW: Advanced Logic to Answer Weakness Questions ---
async def handle_weakness_query(defending_type, process, queue):
    """
    Answers "what is X weak to?" by testing all types against it.
    This function orchestrates multiple tool calls to deduce the answer.
    """
    print(f"🤔 Analyzing weaknesses for type '{defending_type}'... This may take a moment.")
    weak_against = []
    request_id = 1000 # Use a different range for internal requests
    
    tasks = []
    for attacking_type in KNOWN_TYPES:
        if attacking_type == defending_type:
            continue
        
        request = {
            "jsonrpc": "2.0", "id": request_id,
            "method": "tools.call",
            "params": {
                "name": "get_type_effectiveness",
                "arguments": {"attacking_type": attacking_type, "defending_types": [defending_type]}
            }
        }
        tasks.append(send_request(process, queue, request))
        request_id += 1

    results = await asyncio.gather(*tasks)

    for res in results:
        if res and "result" in res:
            text = res["result"]["content"][0]["text"]
            # Parse the multiplier from the response text
            if "x2" in text or "x4" in text:
                attacking_type = text.split("Attacking Type:** ")[1].split("\n")[0].strip().lower()
                weak_against.append(attacking_type.capitalize())

    print("\n--- SERVER RESPONSE ---")
    if weak_against:
        print(f"🔬 Analysis complete!")
        print(f"**{defending_type.capitalize()}** is weak against: {', '.join(weak_against)}")
    else:
        print(f"🔬 Analysis complete! No specific weaknesses found for **{defending_type.capitalize()}**.")
    print("-----------------------")


def process_natural_language_input(input_str):
    """Processes natural language to determine intent and entities."""
    input_lower = input_str.lower()
    words = [word.strip(".,!?()").lower() for word in input_lower.split()]
    pokemon, types = extract_entities(words)

    battle_keywords = ["battle", "fight", "vs", "versus", "simulate", "who would win"]
    if any(keyword in words for keyword in battle_keywords):
        if len(pokemon) >= 2:
            return {"intent": "battle", "pokemon1": pokemon[0], "pokemon2": pokemon[1]}

    type_keywords = ["effective", "weak", "resist", "type", "against", "weakness"]
    if any(keyword in words for keyword in type_keywords):
        if len(types) >= 2:
            return {"intent": "type_check", "attacking": types[0], "defending": types[1:]}
        if len(types) == 1:
            # This is a weakness query, which is handled differently
            return {"intent": "weakness_query", "type": types[0]}

    info_keywords = ["info", "about", "stats", "data", "tell", "show", "moves", "learn"]
    if any(keyword in words for keyword in info_keywords) or (len(pokemon) == 1 and not types):
        if pokemon:
            return {"intent": "info", "pokemon": pokemon[0]}

    return None

async def main():
    """The main asynchronous loop for the robust terminal client."""
    initialize_pokemon_knowledge_base()
    
    project_dir = os.path.dirname(os.path.abspath(__file__))
    server_script = os.path.join(project_dir, "dist", "server.js")
    if not os.path.exists(server_script):
        print("❌ Server script not found. Please run 'npm run build'.")
        sys.exit(1)

    print("\n🚀 Starting Pokémon MCP Server...")
    server_process = subprocess.Popen(
        ['node', server_script], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
        stderr=sys.stderr, text=True, encoding='utf-8', cwd=project_dir
    )

    output_queue = Queue()
    threading.Thread(target=server_output_reader, args=(server_process.stdout, output_queue), daemon=True).start()
    
    print("✅ Server is running. You can now use natural language!")
    print("\n--- Pokémon AI Terminal ---")
    print("Examples:")
    print("  'Tell me about Charizard'")
    print("  'start a battle between Pikachu and Snorlax'")
    print("  'what is the weakness of a psychic type?'")
    print("---------------------------------")

    request_id = 1
    loop = asyncio.get_running_loop()
    while True:
        command_str = await loop.run_in_executor(None, lambda: input("\n> "))
        if not command_str: continue
        if command_str.lower() in ["exit", "quit"]: break
        
        parsed_command = process_natural_language_input(command_str)
        
        if not parsed_command:
            print("❓ I'm not sure how to handle that. Please try rephrasing your request.")
            continue

        intent = parsed_command.get("intent")
        request = None

        if intent == "battle":
            request = {"params": {"name": "battle_simulate", "arguments": {"pokemon1": parsed_command["pokemon1"], "pokemon2": parsed_command["pokemon2"]}}}
        elif intent == "info":
            request = {"params": {"name": "get_pokemon", "arguments": {"name": parsed_command["pokemon"]}}}
        elif intent == "type_check":
            request = {"params": {"name": "get_type_effectiveness", "arguments": {"attacking_type": parsed_command["attacking"], "defending_types": parsed_command["defending"]}}}
        elif intent == "weakness_query":
            # This intent is handled by our new orchestrator function
            await handle_weakness_query(parsed_command["type"], server_process, output_queue)
            continue # Skip the normal request/response loop

        if request:
            full_request = {"jsonrpc": "2.0", "id": request_id, "method": "tools.call", "params": request["params"]}
            response = await send_request(server_process, output_queue, full_request)
            request_id += 1
            
            print("\n--- SERVER RESPONSE ---")
            if response and "result" in response and "content" in response["result"]:
                print(response["result"]["content"][0]["text"])
            elif response and "error" in response:
                print(f"❌ Error: {response['error']['message']}")
            else:
                print(json.dumps(response, indent=2))
            print("-----------------------")

    print("\n👋 Shutting down server...")
    server_process.terminate()
    server_process.wait()
    print("Goodbye!")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")
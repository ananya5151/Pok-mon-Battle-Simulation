# controller.py

# NEW: Import the Ollama library
import ollama
import requests
import json

# --- Configuration ---
# The MCP Server URL is the only configuration we need now!
MCP_SERVER_URL = "http://localhost:3000"
LOCAL_MODEL_NAME = 'llama3:8b-instruct-q4_0' # The model we are running locally

# The System Prompt is slightly adjusted for better reliability with local models.
SYSTEM_PROMPT = """
You are an expert Pokémon assistant. Your job is to translate a user's natural language command into a structured JSON command.
You have access to two tools:
1. `get_pokemon_data`: Use this to get information about a single Pokémon. Requires: `name`. JSON format: {"tool": "get_pokemon_data", "name": "pokemon_name"}
2. `simulate_battle`: Use this to simulate a battle between two Pokémon. Requires: `pokemon1`, `pokemon2`. JSON format: {"tool": "simulate_battle", "pokemon1": "pokemon_one_name", "pokemon2": "pokemon_two_name"}
Based on the user's request, you must respond with ONLY the JSON command in a single line and nothing else.
"""

# NEW: This function is updated to call the local model via Ollama
def ask_local_model_for_command(user_prompt):
    """Sends the user's request to the local model and gets back a JSON command."""
    print(f"🧠 Asking local model ({LOCAL_MODEL_NAME}) to interpret the command...")
    try:
        response = ollama.chat(
            model=LOCAL_MODEL_NAME,
            messages=[
                {'role': 'system', 'content': SYSTEM_PROMPT},
                {'role': 'user', 'content': user_prompt},
            ],
            options={'temperature': 0} # We want deterministic JSON output
        )
        json_command_str = response['message']['content']
        return json.loads(json_command_str)
    except Exception as e:
        print(f"Error communicating with local model: {e}")
        return None

# --- Replace the old execute_command function with this new one ---
def execute_command(command):
    """Executes the command and returns the raw result."""
    tool = command.get("tool")
    print(f"⚙️ Executing tool: {tool}...")

    if tool == "get_pokemon_data":
        name = command.get("name")
        response = requests.get(f"{MCP_SERVER_URL}/resource/pokemon/{name}")
        return response.json() # Return the full JSON data

    elif tool == "simulate_battle":
        p1 = command.get("pokemon1")
        p2 = command.get("pokemon2")
        body = {"pokemon1": p1, "pokemon2": p2}
        response = requests.post(f"{MCP_SERVER_URL}/tool/battle-simulator", json=body)
        battle_log_data = response.json()
        return battle_log_data.get('battleLog', []) # Return the log list

    else:
        return {"error": "Unknown tool."}

# NEW: A function to format the raw data into a human-friendly string.
def present_results(result):
    """Formats the raw data from the server into a nice string."""
    if isinstance(result, list): # This is a battle log
        print("\n--- Battle Report ---")
        for line in result:
            print(line)
    
    elif isinstance(result, dict) and "name" in result: # This is Pokémon data
        pokemon = result
        name = pokemon['name'].capitalize()
        types = " and ".join(pokemon['types']).capitalize()
        evolves_to = pokemon['evolution'].get('evolvesTo')
        
        print(f"\n--- Pokémon Profile ---")
        print(f"{name} is a {types} type Pokémon.")
        
        if evolves_to:
            evolutions = ", ".join(evolves_to).capitalize()
            print(f"It can evolve into: {evolutions}.")
        else:
            print("It is the final form in its evolution chain.")

    else: # This is an error or unknown format
        print(result)

# --- Replace the old main loop with this new one ---
if __name__ == "__main__":
    print(f"✅ Pokémon AI Controller (using Local Model) is ready. Type your command or 'exit' to quit.")
    while True:
        user_input = input("> ")
        if user_input.lower() == 'exit':
            break
        
        command = ask_local_model_for_command(user_input)
        
        if command:
            # 1. Execute the command to get raw data
            raw_result = execute_command(command)
            # 2. Present the data in a friendly format
            present_results(raw_result)

# --- Main Application Loop (updated to call the new local function) ---
if __name__ == "__main__":
    print(f"✅ Pokémon AI Controller (using Local Model) is ready. Type your command or 'exit' to quit.")
    while True:
        user_input = input("> ")
        if user_input.lower() == 'exit':
            break

        command = ask_local_model_for_command(user_input)

        if command:
            result = execute_command(command)
            if isinstance(result, dict):
                print(json.dumps(result, indent=2))
            else:
                print(result)
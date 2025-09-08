# terminal_client.py
import subprocess
import json
import os
import sys
import threading
from queue import Queue, Empty

def server_output_reader(pipe, queue):
    """Reads lines from the server's stdout and puts them in a queue."""
    try:
        for line in iter(pipe.readline, ''):
            queue.put(line)
    finally:
        pipe.close()

def main():
    """A terminal client to interact with the Pokémon MCP server."""
    project_dir = os.path.dirname(os.path.abspath(__file__))
    server_script = os.path.join(project_dir, "dist", "server.js")

    if not os.path.exists(server_script):
        print("❌ Server script not found at 'dist/server.js'.")
        print("Please run 'npm run build' first.")
        sys.exit(1)

    print("🚀 Starting Pokémon MCP Server...")
    server_process = subprocess.Popen(
        ['node', server_script],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=sys.stderr,
        text=True,
        encoding='utf-8', # <--- THIS IS THE FIX
        cwd=project_dir
    )

    # Use a queue to get output from the server thread-safely
    output_queue = Queue()
    reader_thread = threading.Thread(
        target=server_output_reader,
        args=(server_process.stdout, output_queue),
        daemon=True
    )
    reader_thread.start()
    
    print("✅ Server is running in the background.")
    print("\n--- Pokémon Terminal Client ---")
    print("Commands:")
    print("  info <pokemon_name>          - Get data for a Pokémon")
    print("  battle <poke1> vs <poke2>    - Simulate a battle")
    print("  moves <pokemon_name> [limit] - List moves for a Pokémon (limit is optional)")
    print("  exit                         - Quit the client")
    print("---------------------------------")

    request_id = 1
    while True:
        try:
            command_str = input("\n> ")
            parts = command_str.strip().split()
            if not parts:
                continue

            command = parts[0].lower()
            
            if command == "exit":
                break
            
            request = None
            if command == "info" and len(parts) == 2:
                pokemon_name = parts[1]
                request = {
                    "jsonrpc": "2.0", "id": request_id, "method": "resources.read",
                    "params": {"uri": f"pokemon://data/{pokemon_name}"}
                }
            elif command == "battle" and len(parts) == 4 and parts[2].lower() == "vs":
                poke1, poke2 = parts[1], parts[3]
                request = {
                    "jsonrpc": "2.0", "id": request_id, "method": "tools.call",
                    "params": {"name": "battle_simulator", "arguments": {"pokemon1": poke1, "pokemon2": poke2}}
                }
            elif command == "moves" and len(parts) >= 2:
                pokemon_name = parts[1]
                limit = int(parts[2]) if len(parts) > 2 and parts[2].isdigit() else 10
                request = {
                    "jsonrpc": "2.0", "id": request_id, "method": "tools.call",
                    "params": {"name": "list_moves", "arguments": {"name": pokemon_name, "limit": limit}}
                }
            else:
                print("❓ Unknown command. Please use one of the formats listed above.")
                continue

            if request:
                server_process.stdin.write(json.dumps(request) + '\n')
                server_process.stdin.flush()
                request_id += 1

                # Wait for and print the response
                try:
                    response_line = output_queue.get(timeout=20) # 20-second timeout
                    response = json.loads(response_line)
                    
                    print("\n--- SERVER RESPONSE ---")
                    if "result" in response:
                        if "content" in response["result"]: # Tool call
                            print(response["result"]["content"][0]["text"])
                        elif "contents" in response["result"]: # Resource read
                            print(response["result"]["contents"][0]["text"])
                        else:
                            print(json.dumps(response['result'], indent=2))
                    elif "error" in response:
                        print(f"❌ Error: {response['error']['message']}")
                    print("-----------------------")
                except Empty:
                    print("⌛️ Timed out waiting for a response from the server.")

        except (KeyboardInterrupt, EOFError):
            break

    print("\n👋 Shutting down server...")
    server_process.terminate()
    server_process.wait()
    print("Goodbye!")

if __name__ == "__main__":
    main()
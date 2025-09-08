# client.py

import requests
import json
import re

# --- Configuration ---
MCP_SERVER_URL = "http://localhost:3000"

class MCPClient:
    """A client to interact with the Pokemon MCP server."""
    
    def __init__(self, server_url: str):
        self.server_url = server_url
        self.request_id = 1
    
    def _make_request(self, method: str, params: dict = None) -> dict:
        """Helper to make JSON-RPC requests to the MCP server."""
        payload = {"jsonrpc": "2.0", "method": method, "id": self.request_id}
        if params:
            payload["params"] = params
        
        self.request_id += 1
        url_path = method.replace('.', '/')
        url = f"{self.server_url}/mcp/{url_path}"
        
        try:
            response = requests.post(url, json=payload)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"❌ Network Error: Could not connect to the MCP server at {url}. Is it running?")
            return {"error": {"message": str(e)}}

    def call_tool(self, name: str, arguments: dict) -> str:
        """Calls a tool on the MCP server and returns the text content."""
        result = self._make_request("tools.call", {"name": name, "arguments": arguments})
        if "error" in result:
            return f"❌ Tool Error: {result['error']['message']}"
        return result.get("result", {}).get("content", [{}])[0].get("text", "No content returned.")

    def read_resource(self, uri: str) -> str:
        """Reads a resource from the MCP server."""
        result = self._make_request("resources.read", {"uri": uri})
        if "error" in result:
            return f"❌ Resource Error: {result['error']['message']}"
        return result.get("result", {}).get("contents", [{}])[0].get("text", "No content returned.")


class SimulatedAI:
    """
    A simulated AI to parse natural language and determine the user's intent.
    """
    def get_intent(self, user_input: str) -> dict:
        user_input_lower = user_input.lower().strip()
        
        # Battle Intent
        battle_match = re.search(r'(?:battle|fight|vs|versus|simulate).*?([a-zA-Z-]+)\s+(?:and|vs|versus)\s+([a-zA-Z-]+)', user_input_lower)
        if battle_match:
            return {
                "tool_name": "battle_simulator",
                "arguments": {"pokemon1": battle_match.group(1), "pokemon2": battle_match.group(2)}
            }
            
        # Moves Intent
        moves_match = re.search(r'(moves|learn)\s*(?:for|of)?\s+([a-zA-Z-]+)', user_input_lower)
        if moves_match:
            limit_match = re.search(r'\d+', user_input_lower)
            limit = int(limit_match.group(0)) if limit_match else 10
            return {
                "tool_name": "list_moves",
                "arguments": {"name": moves_match.group(2), "limit": limit}
            }
            
        # --- FIXED INFO INTENT REGEX ---
        # This now handles optional words like "for" or "on".
        info_match = re.search(r'(info|stats|about|who is|tell me about)\s+(?:on|for)?\s*([a-zA-Z-]+)', user_input_lower)
        if info_match:
            return {
                "resource_uri": f"pokemon://data/{info_match.group(2)}"
            }

        # Default to info if just a name is provided
        if re.fullmatch(r'[a-zA-Z-]+', user_input_lower):
            return {"resource_uri": f"pokemon://data/{user_input_lower}"}

        return {"error": "I'm sorry, I don't understand that request. Please try asking for 'info on pikachu' or to 'battle charizard vs blastoise'."}


def main():
    """The main chat loop for the AI-powered Pokemon assistant."""
    print("\n==============================================")
    print("🤖 Welcome to the AI-Powered Pokémon Assistant!")
    print("==============================================")
    print("I can provide data on any Pokémon or simulate a battle between two.")
    print("Try asking: 'Tell me about Dragonite' or 'Simulate a battle between Gengar and Alakazam'")
    
    client = MCPClient(MCP_SERVER_URL)
    ai = SimulatedAI()

    while True:
        try:
            user_input = input("\n🧑 You: ").strip()
            if not user_input:
                continue
            if user_input.lower() in ['exit', 'quit']:
                print("👋 Goodbye, Trainer!")
                break

            print("🤖 Assistant: Thinking...")
            
            intent = ai.get_intent(user_input)

            if "error" in intent:
                response = intent["error"]
            elif "tool_name" in intent:
                response = client.call_tool(intent["tool_name"], intent["arguments"])
            elif "resource_uri" in intent:
                response = client.read_resource(intent["resource_uri"])
            else:
                response = "I'm not sure how to handle that request."

            print(f"\n🤖 Assistant:\n{response}")

        except KeyboardInterrupt:
            print("\n👋 Goodbye, Trainer!")
            break
        except Exception as e:
            print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    main()
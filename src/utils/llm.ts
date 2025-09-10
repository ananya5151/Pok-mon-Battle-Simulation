import axios from 'axios';

export type NaturalIntent =
    | { intent: 'battle'; pokemon1: string; pokemon2: string; level?: number; maxTurns?: number; seed?: string | number }
    | { intent: 'stats'; name: string }
    | { intent: 'moves'; name: string; count?: number }
    | { intent: 'info'; name: string }
    | { intent: 'types' }
    | { intent: 'unknown' };

const systemPrompt = `You convert a casual Pokémon command into JSON.
- Output ONLY JSON. No explanations.
- Schema:
    { "intent": "battle|stats|moves|info|types|unknown",
        "pokemon1"?: string,
        "pokemon2"?: string,
        "name"?: string,
        "level"?: number,
        "maxTurns"?: number,
        "seed"?: string }
- Examples:
  "battle pikachu vs charizard" -> {"intent":"battle","pokemon1":"pikachu","pokemon2":"charizard"}
    "battle charizard vs blastoise level 50 seed 12345 turns 200" -> {"intent":"battle","pokemon1":"charizard","pokemon2":"blastoise","level":50,"maxTurns":200,"seed":"12345"}
  "stats bulbasaur" -> {"intent":"stats","name":"bulbasaur"}
    "moves charizard" -> {"intent":"moves","name":"charizard"}
    "list 10 moves lucario" -> {"intent":"moves","name":"lucario","count":10}
  "list all types" -> {"intent":"types"}
  Unknown -> {"intent":"unknown"}`;

async function llmParse(text: string): Promise<NaturalIntent | undefined> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return undefined;
    }
    try {
        const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
        const res = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: text }
                ],
                temperature: 0
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );
        const content = res.data?.choices?.[0]?.message?.content?.trim();
        if (!content) {
            return undefined;
        }
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed.intent === 'string') {
            return parsed as NaturalIntent;
        }
    } catch {
        // ignore and fall back
    }
    return undefined;
}

function regexParse(text: string): NaturalIntent {
    const lower = text.trim().toLowerCase();
    const battleVs = lower.match(/battle\s+([a-z0-9\-\.']+)\s*(?:vs|versus)\s*([a-z0-9\-\.']+)/i)
        || lower.match(/([a-z0-9\-\.']+)\s*(?:vs|versus)\s*([a-z0-9\-\.']+)/i)
        || lower.match(/battle\s+between\s+([a-z0-9\-\.']+)\s+and\s+([a-z0-9\-\.']+)/i);
    if (battleVs) {
        const levelMatch = lower.match(/level\s+(\d{1,3})/i);
        const turnsMatch = lower.match(/(?:max\s+)?turns?\s+(\d{1,4})/i);
        const seedMatch = lower.match(/seed\s+([a-z0-9\-_.]+)/i);
        const level = levelMatch ? parseInt(levelMatch[1], 10) : undefined;
        const maxTurns = turnsMatch ? parseInt(turnsMatch[1], 10) : undefined;
        const seed = seedMatch ? seedMatch[1] : undefined;
        return { intent: 'battle', pokemon1: battleVs[1], pokemon2: battleVs[2], level, maxTurns, seed };
    }

    const stats = lower.match(/stats\s+(?:of|for)?\s*([a-z0-9\-\.']+)/i) || lower.match(/show\s+stats\s+(?:of|for)?\s*([a-z0-9\-\.']+)/i);
    if (stats) {
        return { intent: 'stats', name: stats[1] };
    }

    const moves = lower.match(/(?:list\s+(\d+)\s+moves\s+([a-z0-9\-\.']+))|(?:moves?\s+(?:of|for)?\s*([a-z0-9\-\.']+))/i) || lower.match(/show\s+moves?\s+(?:of|for)?\s*([a-z0-9\-\.']+)/i);
    if (moves) {
        const count = moves[1] ? parseInt(moves[1], 10) : undefined;
        const name = moves[2] || moves[3] || (moves as any)[1];
        return { intent: 'moves', name, count };
    }

    if (lower.includes('types') && (lower.includes('list') || lower.includes('all'))) {
        return { intent: 'types' };
    }

    const info = lower.match(/(info|information|details|data)\s+(?:about|on)?\s*([a-z0-9\-\.']+)/i);
    if (info) {
        return { intent: 'info', name: info[2] };
    }

    return { intent: 'unknown' };
}

export async function interpretCommand(text: string): Promise<NaturalIntent> {
    const llm = await llmParse(text);
    return llm ?? regexParse(text);
}

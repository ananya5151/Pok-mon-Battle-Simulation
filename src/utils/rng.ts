export class RNG {
    private state: number;
    constructor(seed: number | string | undefined) {
        this.state = RNG.hashSeed(seed ?? Date.now());
    }
    static hashSeed(seed: number | string): number {
        const s = typeof seed === 'number' ? seed.toString() : seed;
        let h = 2166136261 >>> 0;
        for (let i = 0; i < s.length; i++) {
            h ^= s.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return (h >>> 0) || 1;
    }
    // Mulberry32 PRNG
    next(): number {
        let t = (this.state += 0x6D2B79F5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    chance(prob: number): boolean {
        return this.next() < prob;
    }
    int(min: number, max: number): number {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }
}

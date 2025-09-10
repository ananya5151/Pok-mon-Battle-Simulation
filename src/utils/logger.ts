type Level = 'error' | 'warn' | 'info' | 'debug';
const level: Level = (process.env.LOG_LEVEL as Level) || 'info';

function shouldLog(l: Level): boolean {
    const order: Record<Level, number> = { error: 0, warn: 1, info: 2, debug: 3 };
    return order[l] <= order[level];
}

export const logger = {
    error: (msg: string) => { if (shouldLog('error')) console.error(`[error] ${msg}`); },
    warn: (msg: string) => { if (shouldLog('warn')) console.error(`[warn] ${msg}`); },
    info: (msg: string) => { if (shouldLog('info')) console.error(`[info] ${msg}`); },
    debug: (msg: string) => { if (shouldLog('debug')) console.error(`[debug] ${msg}`); },
};

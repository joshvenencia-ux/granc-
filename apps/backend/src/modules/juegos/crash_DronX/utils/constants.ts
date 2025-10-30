export const GAME_CODE = 'CRASH_MAIN' as const;
export const CURRENCY = 'COP' as const;
export const MIN_BET = 500;
export const MAX_BET = 100000;
export const MIN_X = 1.01;
export const MAX_X = 5000.0;
export const toCents = (pesos: number) => Math.floor(Number(pesos) * 100);
export const fromCents = (cents: number) => Math.floor(cents) / 100;

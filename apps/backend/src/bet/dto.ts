export class PlaceCrashDto {
    roundId: number;
    userId: number;
    amount: number;      // en COP (pesos) — tu UI usa pesos; convertimos a centavos
    currency: 'COP' | 'USD' | string;
    autoCashout?: number; // multiplicador
    slot?: string;
}

export class CashoutDto {
    x: number;           // multiplicador
    currency: 'COP' | 'USD' | string;
}

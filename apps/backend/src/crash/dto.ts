export class StartRoundDto {
    gameCode: string; // "CRASH_MAIN"
}

export class EndRoundDto {
    roundId: string;
    finalX: number;
}

export class AutoCashoutUpToXDto {
    roundId: string;  // <-- antes era number
    x: number;
}

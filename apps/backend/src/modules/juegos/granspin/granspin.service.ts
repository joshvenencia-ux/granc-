import { Injectable } from '@nestjs/common';
import { JuegosGateway } from 'src/gateway/juegos.gateway'; // Ajusta la ruta según tu estructura

@Injectable()
export class GranSpinService {
    constructor(private readonly juegosGateway: JuegosGateway) { }

    async spin(userId: number, betAmount: number): Promise<any> {
        const result = this.generateRandomResult();
        const payout = this.calculatePayout(result, betAmount);

        // Emitir resultado al socket
        this.juegosGateway.server.emit('granspin:tirada', {
            userId,
            result,
            payout,
        });

        return { result, payout };
    }

    private generateRandomResult(): string[] {
        const symbols = ['🍒', '🍋', '🍇', '🔔', '⭐', '7️⃣'];
        return [
            this.randomSymbol(symbols),
            this.randomSymbol(symbols),
            this.randomSymbol(symbols),
        ];
    }

    private randomSymbol(symbols: string[]): string {
        return symbols[Math.floor(Math.random() * symbols.length)];
    }

    private calculatePayout(spin: string[], betAmount: number): number {
        const [a, b, c] = spin;
        if (a === b && b === c) return betAmount * 5;
        if (a === b || b === c || a === c) return betAmount * 2;
        return 0;
    }
}

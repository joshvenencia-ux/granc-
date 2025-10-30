import { Injectable } from '@nestjs/common';
import { JuegosGateway } from './juegos.gateway';
import { EventosSocket } from './eventos.enum';

@Injectable()
export class CrashXEvents {
    constructor(private readonly gw: JuegosGateway) { }

    roundStart(roundId: number, startsAt?: string) {
        this.gw.emitToGame('dronx', roundId, EventosSocket.DRONX_INICIAR_RONDA, { roundId, startsAt });
    }

    tickX(roundId: number, x: number) {
        this.gw.emitToGame('dronx', roundId, EventosSocket.DRONX_X, { x });
    }

    roundEnd(roundId: number, finalX: number, settledCount?: number) {
        this.gw.emitToGame('dronx', roundId, EventosSocket.DRONX_FINALIZAR_RONDA, { roundId, finalX, settledCount });
    }
}

import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    ConnectedSocket,
    MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

/**
 * Gateway WebSocket (Socket.IO)
 * - Un room por usuario: `user:{userId}`
 * - Eventos que tu Navbar ya consume: "user:saldo", "crash:win"
 */
@WebSocketGateway({
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket'], // forzar WS si quieres evitar long-polling
    namespace: '/',            // usa "/" por simplicidad
})
export class CrashGateway {
    @WebSocketServer() server: Server;

    /**
     * El cliente llama inmediatamente después de conectar:
     * socket.emit('join', { userId })
     */
    @SubscribeMessage('join')
    handleJoin(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { userId?: number },
    ) {
        const userId = Number(data?.userId ?? 0);
        if (!userId || Number.isNaN(userId)) {
            client.emit('error', { message: 'userId inválido en join' });
            return;
        }
        const room = this.roomFor(userId);
        client.join(room);
        client.emit('joined', { room });
    }

    /**
     * Helper: nombre del room de un usuario.
     */
    private roomFor(userId: number) {
        return `user:${userId}`;
    }

    /**
     * Emite a UN usuario específico (por room).
     * Úsalo desde tus servicios: this.gateway.emitToUser(userId, 'user:saldo', { saldoCOP })
     */
    emitToUser(userId: number, event: string, payload: any) {
        this.server.to(this.roomFor(userId)).emit(event, payload);
    }

    /**
     * Opcional: broadcasting a todos (no lo usa la navbar, pero a veces sirve).
     */
    emitAll(event: string, payload: any) {
        this.server.emit(event, payload);
    }
}

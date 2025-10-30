import {
    WebSocketGateway, WebSocketServer,
    OnGatewayConnection, OnGatewayDisconnect,
    SubscribeMessage, ConnectedSocket, MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Inject } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { EventosSocket } from './eventos.enum';

interface UserRepo {
    findOrCreateByFirebaseUid(uid: string): Promise<{ id: number }>;
}

type EmitPayload = Record<string, unknown>;

const ORIGINS = (process.env.WS_CORS_ORIGINS ?? '')
    .split(',').map(s => s.trim()).filter(Boolean);

@Injectable()
@WebSocketGateway({
    cors: {
        origin: ORIGINS.length
            ? ORIGINS
            : ['https://granc.pages.dev', 'https://dronvirtual.pages.dev'],
        credentials: true,
        methods: ['GET', 'POST'],
    },
    transports: ['websocket'],
    namespace: '/',
    maxHttpBufferSize: 1e6,
    pingTimeout: 20000,
    pingInterval: 25000,
})
export class JuegosGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;

    constructor(
        @Inject('FIREBASE_ADMIN') private readonly app: admin.app.App,
        @Inject('USER_REPO') private readonly users: UserRepo,
    ) { }

    private lastEventAt = new WeakMap<Socket, Map<string, number>>();
    private windowCounters = new WeakMap<Socket, Map<string, { t: number; c: number }>>();

    // ===== Rooms =====
    private roomForUser(userId: number) { return `user:${userId}`; }
    public roomForGame(gameCode: string, roundId?: number | string) {
        return `game:${gameCode}:${roundId ?? 'current'}`;
    }

    public emitToUser(userId: number, event: string, payload: EmitPayload) {
        this.server.to(this.roomForUser(userId)).emit(event, payload);
    }
    public emitToGame(gameCode: string, roundId: number | string | undefined, event: string, payload: EmitPayload) {
        const room = this.roomForGame(gameCode, roundId);
        this.server.to(room).emit(event, payload);
    }
    public emitAll(event: string, payload: EmitPayload) {
        this.server.emit(event, payload);
    }

    // ===== Conexión =====
    async handleConnection(client: Socket) {
        try {
            const token =
                (client.handshake.auth?.token as string) ||
                (client.handshake.headers['authorization'] as string)?.replace('Bearer ', '') ||
                '';
            if (!token) throw new Error('ERR_MISSING_TOKEN');

            const decoded = await this.app.auth().verifyIdToken(token, true);
            const user = await this.users.findOrCreateByFirebaseUid(decoded.uid); // puede lanzar USUARIO_NO_PROVISIONADO

            client.data.userId = user.id;
            const userRoom = this.roomForUser(user.id);
            client.join(userRoom);

            // evento “conectado” (si te sirve, tipado por enum)
            client.emit(EventosSocket.CONECTADO, { userRoom });

            this.lastEventAt.set(client, new Map());
            this.windowCounters.set(client, new Map());
        } catch (e: any) {
            const msg = String(e?.message || e);
            if (msg === 'USUARIO_NO_PROVISIONADO') {
                client.emit('sys:error', { code: 'ERR_NO_USER', message: 'Usuario no provisionado' });
            } else if (msg === 'ERR_MISSING_TOKEN') {
                client.emit('sys:error', { code: 'ERR_AUTH', message: 'Token ausente' });
            } else {
                client.emit('sys:error', { code: 'ERR_AUTH', message: 'Unauthorized' });
            }
            client.disconnect(true);
        }
    }

    async handleDisconnect(client: Socket) {
        const userId: number | undefined = client.data.userId;
        if (userId) client.leave(this.roomForUser(userId));
        this.lastEventAt.delete(client);
        this.windowCounters.delete(client);
    }

    private throttle(client: Socket, event: string, ms = 250) {
        const map = this.lastEventAt.get(client);
        if (!map) return false;
        const now = Date.now();
        const last = map.get(event) ?? 0;
        if (now - last < ms) return true;
        map.set(event, now);
        return false;
    }
    private rateLimit(client: Socket, event: string, limit = 10, windowMs = 5000) {
        const map = this.windowCounters.get(client) ?? new Map();
        const now = Date.now();
        const slot = map.get(event) ?? { t: now, c: 0 };
        if (now - slot.t > windowMs) { slot.t = now; slot.c = 0; }
        slot.c++;
        map.set(event, slot);
        this.windowCounters.set(client, map);
        return slot.c > limit;
    }

    @SubscribeMessage('auth:refresh')
    async handleAuthRefresh(@ConnectedSocket() client: Socket, @MessageBody() data: { token?: string }) {
        try {
            if (!data?.token) throw new Error('ERR_MISSING_TOKEN');
            const decoded = await this.app.auth().verifyIdToken(data.token, true);
            const user = await this.users.findOrCreateByFirebaseUid(decoded.uid);

            const prevUserId = client.data.userId as number | undefined;
            if (prevUserId && prevUserId !== user.id) {
                client.leave(this.roomForUser(prevUserId));
                client.join(this.roomForUser(user.id));
            }
            client.data.userId = user.id;
            client.emit('auth:refreshed', { ok: true });
        } catch {
            client.emit('sys:error', { code: 'ERR_AUTH', message: 'Unauthorized (refresh)' });
        }
    }

    @SubscribeMessage('room:join')
    handleRoomJoin(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { gameCode: string; roundId?: number | string },
    ) {
        const userId: number | undefined = client.data.userId;
        if (!userId) return client.emit('sys:error', { code: 'ERR_NO_USER', message: 'No user in context' });
        if (!data?.gameCode) return client.emit('sys:error', { code: 'ERR_BAD_INPUT', message: 'Missing gameCode' });

        const room = this.roomForGame(data.gameCode, data.roundId);
        client.join(room);
        client.emit('room:joined', { room });
    }
}

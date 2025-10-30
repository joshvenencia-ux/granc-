import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';                   
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { Prisma, JuegoTipo } from '@prisma/client'; 

describe('CrashX E2E', () => {
    let app: INestApplication;
    let prisma: PrismaService;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        prisma = moduleFixture.get(PrismaService);
        await app.init();

        await prisma.$executeRawUnsafe(`
      TRUNCATE
        "Movimiento",
        "Transferencia",
        "DronXApuesta",
        "Apuesta",
        "Juego",
        "Wallet",
        "Usuario"
      RESTART IDENTITY CASCADE;
    `);

        const user = await prisma.usuario.create({
            data: {
                nombre_completo: 'Test User',
                usuario: 'test',
                correo: 'test@mail.com',
                contrasena: 'x',
                cedula: '123',
                rol: 'PLAYER',
                estado_de_cuenta: 'ACTIVO',
            },
        });

        await prisma.wallet.upsert({
            where: { usuarioId: user.id },
            update: { balance: new Prisma.Decimal(100000) }, // 100,000 COP
            create: { usuarioId: user.id, balance: new Prisma.Decimal(100000) },
        });
    });

    afterAll(async () => {
        await app.close();
    });

    it('POST /api/crash/startRound → inicia ronda', async () => {
        const res = await request(app.getHttpServer())
            .post('/api/crash/startRound')                 // ✅ usa tus rutas reales
            .send({ gameCode: 'CRASH_MAIN' });

        expect(res.status).toBeGreaterThanOrEqual(200);
        expect(res.status).toBeLessThan(300);
        expect(res.body.roundId).toBeDefined();
    });

    it('POST /api/crash/endRound → cierra ronda', async () => {
        const juego = await prisma.juego.create({
            data: {
                tipo_juego: JuegoTipo.DRONX,                
                usuarioId: 1,
                serverSeedHash: `hash-${Date.now()}`,
            },
        });

        const res = await request(app.getHttpServer())
            .post('/api/crash/endRound')                  
            .send({ roundId: juego.id, finalX: 2.5 });

        expect(res.status).toBeGreaterThanOrEqual(200);
        expect(res.status).toBeLessThan(300);
        expect(res.body.ok ?? res.body.closed).toBeTruthy();
    });
});

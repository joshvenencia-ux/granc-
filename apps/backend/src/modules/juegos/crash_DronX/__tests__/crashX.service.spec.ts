import { Test, TestingModule } from '@nestjs/testing';
import { CrashXService } from '../crashX.service';
import { PrismaService } from '../../../../prisma/prisma.service';
import { BetService } from '../../../../bet/bet.service';

describe('CrashXService', () => {
    let service: CrashXService;
    let prisma: PrismaService;
    let bet: BetService;

    // ---- Mocks base ----
    const prismaMock = {
        juego: {
            create: jest.fn(),
            update: jest.fn(),
            findUnique: jest.fn(),
        },
    } as unknown as PrismaService;

    const betMock = {
        settleRoundLosses: jest.fn() as jest.MockedFunction<
            (roundId: number, finalX: number) => Promise<{ juegoId: number; finalX: number; settledCount: number }>
        >,
    } as unknown as BetService;

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CrashXService,
                { provide: PrismaService, useValue: prismaMock },
                { provide: BetService, useValue: betMock },
            ],
        }).compile();

        service = module.get<CrashXService>(CrashXService);
        prisma = module.get<PrismaService>(PrismaService);
        bet = module.get<BetService>(BetService);
    });

    it('debería estar definido', () => {
        expect(service).toBeDefined();
    });

    it('startRound: crea la ronda y devuelve roundId/startsAt', async () => {
        (prisma.juego.create as any).mockResolvedValue({ id: 100, fecha_partida: new Date() });

        const out = await service.startRound({ startedBy: 1, gameCode: 'CRASH_MAIN' });

        expect(prisma.juego.create).toHaveBeenCalled();
        expect(out.roundId).toBeDefined();
        expect(out.startsAt).toBeDefined();
    });

    it('endRound: actualiza el juego y liquida pérdidas', async () => {
        const roundId = 77;
        const finalX = 1.75;

        (prisma.juego.update as any).mockResolvedValue({ id: roundId });
        (bet.settleRoundLosses as jest.MockedFunction<any>).mockResolvedValue({
            juegoId: roundId,
            finalX,
            settledCount: 2,
        });

        const res = await service.endRound(roundId, finalX); 

        expect(prisma.juego.update).toHaveBeenCalled();
        expect(bet.settleRoundLosses).toHaveBeenCalledWith(roundId, finalX);
        expect(res).toEqual({ ok: true, roundId, finalX });
    });
});

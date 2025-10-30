import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JuegosService {
    constructor(private prisma: PrismaService) { }

    async findOne(id: number) {
        const juego = await this.prisma.juego.findUnique({ where: { id } });
        if (!juego) throw new NotFoundException('Juego no encontrado');
        return juego;
    }

    async list({ limit = 50 }: { limit?: number } = {}) {
        return this.prisma.juego.findMany({
            orderBy: { fecha_partida: 'desc' },
            take: Math.min(200, Math.max(1, limit)),
        });
    }
}

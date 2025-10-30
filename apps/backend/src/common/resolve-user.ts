import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { toDec } from '../common/money';

@Injectable()
export class ResolverUserService {
    constructor(private prisma: PrismaService) { }

    /** Busca el ID usando correo. Lanza 404 si no existe */
    async usuarioIdByEmail(email: string): Promise<number> {
        const u = await this.prisma.usuario.findUnique({ where: { correo: email } });
        if (!u) throw new NotFoundException('Usuario no existe');
        return u.id;
    }

    /** Crea wallet si no existe */
    async ensureWallet(usuarioId: number) {
        await this.prisma.wallet.upsert({
            where: { usuarioId },
            update: {},
            create: { usuarioId, balance: toDec(0) },
        });
    }
}

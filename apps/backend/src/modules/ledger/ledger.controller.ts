import { Controller, Get, Query, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { FirebaseAuthGuard } from '../../auth/firebase.guard';

type AuthedReq = Request & { user?: { uid?: string; email?: string } };

@Controller('ledger')
export class LedgerController {
    constructor(private readonly ledger: LedgerService) { }

    @UseGuards(FirebaseAuthGuard)
    @Get('resumen')
    async resumen(@Req() req: AuthedReq, @Query('id') id?: string) {
        if (id && id.trim()) {
            return this.ledger.getResumenByIdentifier(id.trim());
        }

        // Sin id: usar uid de Firebase del token
        const fbUid = req.user?.uid;
        if (!fbUid) throw new BadRequestException('Falta uid del token');
        return this.ledger.getResumenByFirebaseUid(fbUid);
    }
}

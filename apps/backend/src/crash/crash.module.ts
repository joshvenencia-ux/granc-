import { Module } from '@nestjs/common';
import { CrashService } from './crash.service';
import { CrashController } from './crash.controller';
import { PrismaService } from '../prisma/prisma.service';
import { BetModule } from '../bet/bet.module';

@Module({
    imports: [BetModule],          // ⬅️ necesitamos BetService
    controllers: [CrashController],
    providers: [CrashService, PrismaService],
})
export class CrashModule { }

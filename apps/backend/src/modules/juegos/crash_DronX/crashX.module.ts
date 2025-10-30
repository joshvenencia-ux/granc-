import { Module } from '@nestjs/common';
import { CrashXService } from './crashX.service';
import { CrashXController } from './crashX.controller';

import { PrismaModule } from '../../../prisma/prisma.module';
import { BetModule } from '../../../bet/bet.module';
import { FirebaseModule } from '../../firebase/firebase.module'; 
import { JuegosGatewayModule } from '../../../gateway/juegos.gateway.module';
import { CrashXEvents } from '../../../gateway/crashx.events';

@Module({
    imports: [
        PrismaModule,         
        FirebaseModule,      
        BetModule,            
        JuegosGatewayModule,  
    ],
    controllers: [CrashXController],
    providers: [CrashXService, CrashXEvents],
    exports: [CrashXService], 
})
export class CrashXModule { }

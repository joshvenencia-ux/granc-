import { Module } from '@nestjs/common';
import { GranSpinService } from './granspin.service';
import { GranSpinController } from './granspin.controller';

@Module({
    controllers: [GranSpinController],
    providers: [GranSpinService],
})
export class GranSpinModule { }

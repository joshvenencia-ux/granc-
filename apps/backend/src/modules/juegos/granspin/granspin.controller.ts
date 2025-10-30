import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { GranSpinService } from './granspin.service';

@Controller('granspin')
export class GranSpinController {
    constructor(private readonly granSpinService: GranSpinService) { }

    @Post('spin')
    async spin(@Body() body: { amount: number; userId: number }) {
        const { userId, amount } = body;
        if (!userId || !amount) {
            return { error: 'userId y amount son requeridos' };
        }

        const result = await this.granSpinService.spin(userId, amount);
        return result;
    }
}

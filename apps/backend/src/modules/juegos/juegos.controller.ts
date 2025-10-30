import { Controller, Get, Param, Query } from '@nestjs/common';
import { JuegosService } from './juegos.service';

@Controller('api/juegos')
export class JuegosController {
    constructor(private readonly service: JuegosService) { }

    @Get()
    list(@Query('limit') limit?: string) {
        return this.service.list({ limit: limit ? Number(limit) : 50 });
    }

    @Get(':id')
    get(@Param('id') id: string) {
        return this.service.findOne(Number(id));
    }
}

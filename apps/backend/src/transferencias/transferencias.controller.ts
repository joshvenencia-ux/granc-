import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
} from '@nestjs/common';
import { TransferenciasService } from './transferencias.service';

@Controller('transferencias')
export class TransferenciasController {
    constructor(private readonly service: TransferenciasService) { }

    @Post()
    async create(@Body() body: { usuarioId: number; monto: number; motivo?: string }) {
        return this.service.create(body);
    }

    @Patch(':id/completar')
    async completar(@Param('id') id: string) {
        return this.service.completar(Number(id));
    }

    @Patch(':id/fallar')
    async fallar(@Param('id') id: string) {
        return this.service.marcarFallida(Number(id));
    }

    @Get(':usuarioId')
    async listar(@Param('usuarioId') usuarioId: string) {
        return this.service.listarPorUsuario(Number(usuarioId));
    }
}

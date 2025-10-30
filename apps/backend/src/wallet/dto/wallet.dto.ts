import { IsInt, IsOptional, IsString } from 'class-validator';

export class AdjustDto {
    @IsInt()
    delta!: number;

    @IsString()
    @IsOptional()
    motivo?: string;
}

export class AdminAdjustDto {
    @IsInt()
    usuarioId!: number;

    @IsInt()
    delta!: number; // pesos

    @IsString()
    @IsOptional()
    motivo?: string;

    /** idempotencia opcional */
    @IsString()
    @IsOptional()
    referencia?: string;
}

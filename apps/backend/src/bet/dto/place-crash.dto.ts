// src/bet/dto/place-crash.dto.ts
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class PlaceCrashDto {
    @IsString()
    roundId: string;

    @IsNumber()
    userId: number;

    @IsNumber()
    amount: number;

    @IsOptional()
    @IsNumber()
    autoCashout?: number;
}

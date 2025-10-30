import { IsOptional, IsString, IsInt, Min } from 'class-validator';

export class StartRoundDTO {
    @IsOptional() @IsString()
    gameCode?: string;

    @IsOptional() @IsInt() @Min(1)
    startedBy?: number; // normalmente se resuelve por token/header
}

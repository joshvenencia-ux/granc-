import { IsInt, IsNumber, Min } from 'class-validator';

export class AutoCashoutDTO {
    @IsInt() @Min(1)
    roundId!: number;

    @IsNumber() @Min(1)
    x!: number;
}

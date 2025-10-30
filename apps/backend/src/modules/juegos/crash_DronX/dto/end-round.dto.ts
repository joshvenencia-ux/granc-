import { IsInt, IsNumber, Min } from 'class-validator';

export class EndRoundDTO {
    @IsInt() @Min(1)
    roundId!: number;

    @IsNumber() @Min(0.01)
    finalX!: number;
}

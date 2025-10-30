import { IsString, Matches, MinLength, MaxLength } from 'class-validator';

export class UpdateUsernameDto {
    @IsString()
    @MinLength(3)
    @MaxLength(20)
    @Matches(/^[a-zA-Z0-9_.-]+$/, {
        message: 'El usuario solo puede contener letras, números, ".", "_" o "-"',
    })
    usuario: string;
}

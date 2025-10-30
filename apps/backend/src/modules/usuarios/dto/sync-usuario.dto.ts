import { IsEmail, IsOptional, IsString } from 'class-validator';

export class SyncUsuarioDto {
    @IsEmail()
    email: string;

    @IsString()
    name: string;

    @IsString()
    apellido: string;

    @IsOptional()
    @IsString()
    usuario?: string;

    @IsString()
    cedula: string;

    @IsString()
    celular: string;

    @IsOptional()
    @IsString()
    direccion?: string;

    @IsString()
    fechaNacimiento: string;

    @IsString()
    genero: string;
}

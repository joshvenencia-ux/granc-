import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUsuarioDto {
    @IsEmail()
    correo: string;

    @IsString()
    nombre_completo: string;

    @IsString()
    usuario: string;

    @IsString()
    @MinLength(6)
    contrasena: string;

    @IsString()
    cedula: string;

    @IsString()
    rol: string;

    @IsOptional()
    @IsString()
    apellido?: string;

    @IsOptional()
    @IsString()
    celular?: string;

    @IsOptional()
    @IsString()
    direccion?: string;

    @IsOptional()
    @IsString()
    fechaNacimiento?: string;

    @IsOptional()
    @IsString()
    genero?: string;
}

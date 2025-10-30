import { IsIn } from 'class-validator';

export class UpdateEstadoDto {
    @IsIn(['online', 'offline'])
    estado: 'online' | 'offline';
}

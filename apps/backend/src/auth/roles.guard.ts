import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY, AppRole } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) { }

    canActivate(ctx: ExecutionContext): boolean {
        const required = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
            ctx.getHandler(),
            ctx.getClass(),
        ]);

        if (!required || required.length === 0) return true;

        const req = ctx.switchToHttp().getRequest<Request>();
        const user: any = (req as any).firebaseUser || (req as any).user;

        if (!user) throw new ForbiddenException('Usuario no autenticado');

        if (user.isAdmin === true || user.admin === true) return true;

        const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
        const ok = required.some((r) => roles.includes(r));

        if (!ok) throw new ForbiddenException('Acceso denegado');
        return true;
    }
}

import {
    CanActivate,
    ExecutionContext,
    Injectable,
    Inject,
    UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Auth, DecodedIdToken } from 'firebase-admin/auth';
import { FIREBASE_AUTH } from '../modules/firebase/firebase.constants';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
    constructor(@Inject(FIREBASE_AUTH) private readonly auth: Auth) { }

    async canActivate(ctx: ExecutionContext): Promise<boolean> {
        const req = ctx.switchToHttp().getRequest<Request>();
        const hdr = req.headers.authorization || '';
        const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';

        if (!token) throw new UnauthorizedException('Token no enviado');

        let decoded: DecodedIdToken;
        try {
            decoded = await this.auth.verifyIdToken(token);
        } catch {
            throw new UnauthorizedException('Token inválido o expirado');
        }

        const adminClaim =
            (decoded as any).admin === true ||
            (decoded as any).isAdmin === true ||
            (decoded as any).claims?.admin === true;

        const tokenRolesRaw: unknown =
            (decoded as any).roles ??
            (decoded as any).claims?.roles ??
            ((decoded as any).role ? [(decoded as any).role] : []);

        const roles: string[] = Array.isArray(tokenRolesRaw)
            ? tokenRolesRaw.map(String)
            : [];

        if (adminClaim && !roles.includes('admin')) roles.push('admin');

        const normalized = {
            uid: decoded.uid,
            email: decoded.email,
            claims: decoded,
            roles,
            isAdmin: adminClaim,
            admin: adminClaim, // alias
        };

        (req as any).user = normalized;
        (req as any).firebaseUser = normalized;

        return true;
    }
}

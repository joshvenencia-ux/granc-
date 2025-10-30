import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';
export const UserId = createParamDecorator((_d, ctx: ExecutionContext) => {
    const id = Number(ctx.switchToHttp().getRequest().headers['x-user-id']);
    if (!Number.isFinite(id) || id <= 0) throw new BadRequestException('X-User-Id inválido');
    return id;
});

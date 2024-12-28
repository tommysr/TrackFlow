import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IcpUser } from '../entities/icp.user.entity';
import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';

export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): IcpUser => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
); 
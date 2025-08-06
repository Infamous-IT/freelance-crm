import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserSecure } from 'src/modules/user/entities/user.entity';

export const CurrentUser = createParamDecorator(
  ( data: unknown, ctx: ExecutionContext ): UserSecure => {
    const request = ctx.switchToHttp().getRequest();

    return request.user;
  }
);

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { CurrentUser as User } from './firebase-auth.guard';

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): User => ctx.switchToHttp().getRequest().user,
);

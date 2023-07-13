import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { FirebaseUser } from 'src/services/firebase.service';

export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): FirebaseUser => {
    const request = ctx.switchToHttp().getRequest();
    if (request.user) {
      return request.user;
    }
    throw new UnauthorizedException();
  },
);

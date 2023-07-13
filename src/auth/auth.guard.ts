import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { FirebaseService, FirebaseUser } from 'src/services/firebase.service';

interface AuthenticatedRequest extends Request {
  user: FirebaseUser;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private firebase: FirebaseService) {}

  /**
   * Makes sure a user is logged in
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      const user = await this.firebase.verifyToken(token);
      request.user = user;
    } catch (error) {
      throw new UnauthorizedException();
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../utility-modules/prisma/prisma.service';
import logger from '../../../utils/logging/winston-config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly config: ConfigService, private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: number; email: string; iat: number }) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
      include: {
        InvalidUserSession: true,
      },
    });
    if (!user) throw new UnauthorizedException('User not found');
    if (user.InvalidUserSession.length > 1) logger.error(`User ${user.email} with id ${user.id} has more than one invalid session`);
    if (user.InvalidUserSession.length > 0 && payload.iat <= user.InvalidUserSession[0].updatedAt.getTime())
      throw new UnauthorizedException('Invalid session');

    delete user.InvalidUserSession;
    delete user.hash;
    return user;
  }
}

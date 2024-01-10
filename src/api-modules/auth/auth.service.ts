import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../utility-modules/prisma/prisma.service';
import { AuthDto, AuthSigninDto } from './dto/request';
import * as argon from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import logger from '../../utils/logging/winston-config';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private jwt: JwtService, private config: ConfigService) {}

  async signup(dto: AuthDto) {
    // generate the password hash
    const hash = await argon.hash(dto.password);
    // save the new user in the db
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          hash,
        },
      });

      logger.info(`User ${user.email} with id ${user.id} created`);

      const returnObj = { ...user, access_token: (await this.signToken(user.id, user.email)).access_token };
      delete returnObj.hash;
      return returnObj;
    } catch (error) {
      if (error.constructor.name === 'PrismaClientKnownRequestError') {
        if (error.code === 'P2002') {
          throw new ForbiddenException('Email taken');
        }
      }
      throw error;
    }
  }

  async signin(dto: AuthSigninDto) {
    // find the user by email
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });
    // if user does not exist throw exception
    if (!user) throw new ForbiddenException('User not Found');

    // compare password
    const pwMatches = await argon.verify(user.hash, dto.password);
    // if password incorrect throw exception
    if (!pwMatches) throw new ForbiddenException('Password incorrect');

    logger.info(`User ${user.email} with id ${user.id} logged in`);
    const returnObj = { ...user, access_token: (await this.signToken(user.id, user.email)).access_token };
    delete returnObj.hash;
    return returnObj;
  }

  async signToken(userId: number, email: string): Promise<{ access_token: string }> {
    const payload = {
      sub: userId,
      email,
    };
    const secret = this.config.get('JWT_SECRET');

    const token = await this.jwt.signAsync(payload, {
      expiresIn: '10d',
      secret: secret,
    });

    return {
      access_token: token,
    };
  }
}

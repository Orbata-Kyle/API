import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../utility-modules/prisma/prisma.service';
import { AuthDto, AuthSigninDto } from './dto/request';
import * as argon from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import logger from '../../utils/logging/winston-config';
import { MailerService } from '@nestjs-modules/mailer';
import { SafeUser } from 'src/types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private readonly mailerService: MailerService,
  ) {}

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
          birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
          phoneNumber: dto.phoneNumber,
          gender: dto.gender,
          country: dto.country,
          hash,
        },
      });

      logger.info(`User ${user.email} with id ${user.id} created`);

      const returnObj = { ...user, access_token: (await this.signToken(user.id, user.email)).access_token };
      delete returnObj.hash;
      delete returnObj.activePasswordResetToken;

      if (returnObj.birthDate) {
        return { ...returnObj, birthDate: returnObj.birthDate.toISOString() };
      } else {
        return returnObj;
      }
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
    delete returnObj.activePasswordResetToken;

    if (returnObj.birthDate) {
      return { ...returnObj, birthDate: returnObj.birthDate.toISOString() };
    } else {
      return returnObj;
    }
  }

  async forgotPassword(email: string): Promise<string> {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      throw new BadRequestException('User with that email not found');
    }

    const resetToken = await this.signPasswordResetToken(user.id);

    // So that the token is only for one use
    await this.prisma.user.update({
      where: { id: user.id },
      data: { activePasswordResetToken: resetToken },
    });

    // Send email with resetToken
    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Password reset',
      template: './reset-pw',
      context: {
        resetToken,
        firstName: user.firstName,
      },
    });
    logger.info(`Password reset token for user ${user.id} sent`);
    return 'Email sent';
  }

  async resetPassword(email: string, resetToken: string, newPassword: string): Promise<string> {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      throw new BadRequestException('User with that email not found');
    }

    // Check that it is the current active token for the user
    if (resetToken !== user.activePasswordResetToken) {
      throw new BadRequestException('Invalid token');
    }

    const tokenValid = await this.verifyPasswordResetToken(resetToken, user.id);
    if (!tokenValid) {
      throw new BadRequestException('Invalid token');
    }

    // Valid token, reset password
    const hash = await argon.hash(newPassword);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { hash, activePasswordResetToken: null },
    });
    await this.invalidateSessions(user.id);

    logger.info(`Password reset for user ${user.id}`);
    return 'Password reset';
  }

  async signToken(userId: number, email: string): Promise<{ access_token: string }> {
    const payload = {
      sub: userId,
      email,
      iat: Date.now(),
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

  async invalidateSessions(userId: number): Promise<void> {
    await this.prisma.invalidUserSession.upsert({
      where: { userId: userId },
      update: { updatedAt: new Date() },
      create: { userId: userId },
    });
  }

  private async signPasswordResetToken(userId: number): Promise<string> {
    const payload = {
      sub: userId,
      type: 'password-reset',
      iat: Date.now(),
    };

    const secret = this.config.get('JWT_SECRET');
    const token = await this.jwt.signAsync(payload, {
      expiresIn: '1h',
      secret: secret,
    });

    return token;
  }

  private async verifyPasswordResetToken(token: string, userId: number): Promise<boolean> {
    try {
      const payload = await this.jwt.verifyAsync(token, {
        secret: this.config.get('JWT_SECRET'),
      });

      if (!payload.sub || (payload.sub && payload.sub !== userId)) {
        return false;
      }
      if (!payload.type || (payload.type && payload.type !== 'password-reset')) {
        return false;
      }
    } catch (error) {
      logger.warn(error);
      return false;
    }

    return true;
  }
}

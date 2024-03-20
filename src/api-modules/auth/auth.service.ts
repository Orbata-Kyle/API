import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../utility-modules/prisma/prisma.service';
import { AuthDto, AuthSigninDto } from './dto/request';
import * as argon from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import logger from '../../utils/logging/winston-config';
import { MailerService } from '@nestjs-modules/mailer';

type PasswordResetTokenPayload = {
  sub: number;
  type: 'password-reset';
  iat: number;
};

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

    // So that the token is only for one use
    await this.prisma.userExtras.upsert({
      where: { userId: user.id },
      update: { activePasswordResetToken: resetToken },
      create: {
        userId: user.id,
        activePasswordResetToken: resetToken,
      },
    });

    logger.info(`Password reset token for user ${user.id} sent`);
    return 'Email sent';
  }

  async resetPassword(resetToken: string, newPassword: string): Promise<string> {
    let tokenPayload: PasswordResetTokenPayload;
    try {
      tokenPayload = await this.verifyPasswordResetToken(resetToken);
    } catch (error) {
      throw new BadRequestException('Invalid token');
    }

    if (!tokenPayload || tokenPayload.type !== 'password-reset') {
      throw new BadRequestException('Invalid token');
    }

    // Check that it is the current active token for the user
    const userExtras = await this.prisma.userExtras.findUnique({
      where: { userId: tokenPayload.sub },
    });
    if (resetToken !== userExtras.activePasswordResetToken) {
      throw new BadRequestException('Invalid token');
    }

    // Valid token, reset password
    const hash = await argon.hash(newPassword);
    await this.prisma.user.update({
      where: { id: tokenPayload.sub },
      data: {
        hash: hash,
        UserExtras: {
          updateMany: {
            where: {
              userId: tokenPayload.sub,
            },
            data: {
              activePasswordResetToken: null,
            },
          },
        },
      },
    });
    await this.invalidateSessions(tokenPayload.sub);

    logger.info(`Password reset for user ${tokenPayload.sub}`);
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
    const payload: PasswordResetTokenPayload = {
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

  private async verifyPasswordResetToken(token: string): Promise<PasswordResetTokenPayload> {
    const payload = await this.jwt.verifyAsync(token, {
      secret: this.config.get('JWT_SECRET'),
    });
    return payload as PasswordResetTokenPayload;
  }
}

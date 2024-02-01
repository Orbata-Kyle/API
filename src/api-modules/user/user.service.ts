import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../utility-modules/prisma/prisma.service';
import { SafeUser } from '../../types';
import logger from '../../utils/logging/winston-config';
import { EditUserDto } from './dto/request';
import * as argon from 'argon2';
import { User } from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { SafeUserWithTokenDto } from './dto/response/safe-user-with-token.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService, private readonly authService: AuthService) {}

  async retrieveOwnUser(user: SafeUser) {
    logger.info(`User ${user.email} with id ${user.id} retrieved`);
    return user;
  }

  async retrieveOwnRatings(userId: number) {
    const user = await this.prisma.userMovieRating.findMany({
      where: { userId: userId },
      select: {
        movie: { select: { id: true, title: true } },
        interactionStatus: true,
      },
    });
    logger.info(`User ${userId} ratings retrieved`);
    return user;
  }

  async getUserById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        UserMovieRating: {
          select: {
            movie: { select: { id: true, title: true } },
            interactionStatus: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    delete user.hash;
    return user;
  }

  async changeProfile(dto: EditUserDto, userId: number): Promise<SafeUserWithTokenDto> {
    const updatedUser = {
      firstName: undefined,
      lastName: undefined,
      hash: undefined,
      email: undefined,
    };
    let newAccessToken: string;

    if (dto.password) {
      const hash = await argon.hash(dto.password);
      updatedUser.hash = hash;

      // Invalidate all sessions for this user
      await this.prisma.invalidUserSession.upsert({
        where: { userId: userId },
        update: { updatedAt: new Date() },
        create: { userId: userId },
      });

      // Wait some time before creating new token to ensure getting a valid token
      await new Promise((resolve) => setTimeout(resolve, 10));

      newAccessToken = (await this.authService.signToken(userId, dto.email)).access_token;
    }
    if (dto.firstName) {
      updatedUser.firstName = dto.firstName;
    }
    if (dto.lastName) {
      updatedUser.lastName = dto.lastName;
    }
    if (dto.email) {
      updatedUser.email = dto.email;
    }

    const user = await this.prisma.user.update({ where: { id: userId }, data: { ...updatedUser } });
    logger.info(`User ${userId} profile changed`);

    delete user.hash;
    return {
      ...user,
      access_token: newAccessToken,
    };
  }
}

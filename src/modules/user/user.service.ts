import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SafeUser } from '../../types';
import logger from '../../utils/logging/winston-config';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

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
    delete user.hash;
    return user;
  }
}

import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { TheMovieDb } from 'src/services/the-movie-db.service';

@Controller('user')
export class UserController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly theMovieDb: TheMovieDb,
  ) {}

  @Get()
  async listUsers() {
    const users = await this.prisma.user.findMany({});

    return users;
  }

  @Get(':id')
  async getUserById(@Param('id') id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        UserMovieRating: {
          include: { movie: { select: { id: true, title: true } } },
          where: { likedStatus: 'liked' },
        },
      },
    });

    return user;
  }

  @Post('create')
  async createUser(@Query('username') username: string) {
    const user = await this.prisma.user.create({
      data: { name: username, email: `${username}@orbata.co` },
    });

    return user;
  }
}

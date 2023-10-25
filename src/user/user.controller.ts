import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtGuard } from 'src/auth/guard';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetUser } from 'src/auth/decorator';
import { User } from '@prisma/client';
import { SafeUser } from 'src/types';

@Controller('user')
export class UserController {
  constructor(
    private readonly prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  @UseGuards(JwtGuard)
  @Get()
  async listUsers(@GetUser() user: SafeUser) {
    return user;
  }

  //TODO Admin guard
  @Get(':id')
  async getUserById(@Param('id', ParseIntPipe) id: number) {
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
}

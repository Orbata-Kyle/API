import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { User } from 'src/auth/user.decorator';
import { PrismaService } from 'src/prisma.service';
import { FirebaseUser } from 'src/services/firebase.service';

@Controller('user')
export class UserController {
  constructor(private readonly prisma: PrismaService) {}

  @UseGuards(AuthGuard)
  @Get()
  async listUsers(@User() user: FirebaseUser) {
    return user;
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

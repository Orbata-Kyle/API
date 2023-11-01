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
import { JwtGuard } from '../../modules/auth/guard';
import { PrismaService } from '../../prisma/prisma.service';
import { GetUser } from '../../modules/auth/decorator';
import { User } from '@prisma/client';
import { SafeUser } from '../../types';
import logger from '../../utils/logging/winston-config';
import { JwtAdminGuard } from '../../modules/auth/guard/jwt-admin.guard';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(
    private readonly prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private userService: UserService,
  ) {}

  @UseGuards(JwtGuard)
  @Get()
  async retireveOwnUser(@GetUser() user: SafeUser) {
    return this.userService.retrieveOwnUser(user);
  }

  @UseGuards(JwtGuard)
  @Get('ratings')
  async retrieveOwnRatings(@GetUser('id') userId: number) {
    return this.userService.retrieveOwnRatings(userId);
  }

  @UseGuards(JwtAdminGuard)
  @Get(':id')
  async getUserById(@Param('id', ParseIntPipe) id: number) {
    return this.userService.getUserById(id);
  }
}

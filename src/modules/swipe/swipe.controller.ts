import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { GetUser } from '../../modules/auth/decorator';
import { JwtGuard } from '../../modules/auth/guard';
import { SwipeService } from './swipe.service';

@Controller('swipe')
export class SwipeController {
  constructor(private readonly swipeService: SwipeService) {}

  @UseGuards(JwtGuard)
  @Get('next')
  async getNextMovieToSwipe(@GetUser('id') userId: number) {
    return this.swipeService.getNextMovieToSwipe(userId);
  }
}

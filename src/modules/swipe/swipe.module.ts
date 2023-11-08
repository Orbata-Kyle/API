import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TheMovieDb } from '../../services/the-movie-db.service';
import { SwipeController } from './swipe.controller';
import { SwipeService } from './swipe.service';

@Module({
  imports: [],
  controllers: [SwipeController],
  providers: [SwipeService, PrismaService, TheMovieDb],
})
export class SwipeModule {}

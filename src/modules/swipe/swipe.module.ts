import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SwipeController } from './swipe.controller';
import { SwipeService } from './swipe.service';
import { MovieCacheModule } from '../../movie-cache/db-movie-cache.module';

@Module({
  imports: [MovieCacheModule],
  controllers: [SwipeController],
  providers: [SwipeService, PrismaService],
})
export class SwipeModule {}

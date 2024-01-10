import { Module } from '@nestjs/common';
import { PrismaService } from '../../utility-modules/prisma/prisma.service';
import { SwipeController } from './swipe.controller';
import { SwipeService } from './swipe.service';
import { MovieCacheModule } from '../../utility-modules/movie-cache/db-movie-cache.module';

@Module({
  imports: [MovieCacheModule],
  controllers: [SwipeController],
  providers: [SwipeService, PrismaService],
})
export class SwipeModule {}

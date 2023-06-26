import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SimilarityService } from './similarity.service';
import { PrismaService } from './prisma.service';
import { ConfigModule } from '@nestjs/config';
import { TheMovieDb } from './services/the-move-db.service';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [AppController],
  providers: [AppService, SimilarityService, PrismaService, TheMovieDb],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SimilarityService } from './similarity.service';
import { PrismaService } from './prisma.service';
import { ConfigModule } from '@nestjs/config';
import { TheMovieDb } from './services/the-movie-db.service';
import { MovieController } from './movie/movie.controller';
import { UserController } from './user/user.controller';
import { FirebaseService } from './services/firebase.service';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [AppController, MovieController, UserController],
  providers: [
    AppService,
    SimilarityService,
    PrismaService,
    TheMovieDb,
    FirebaseService,
  ],
})
export class AppModule {}

import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SimilarityService } from './similarity.service';
import { PrismaService } from './prisma.service';
import { ConfigModule } from '@nestjs/config';
import { TheMovieDb } from './services/the-movie-db.service';
import { MovieController } from './controllers/movie/movie.controller';
import { UserController } from './controllers/user/user.controller';
import { FirebaseService } from './services/firebase.service';
import { SwipeController } from './controllers/swipe/swipe.controller';
import { LoggingMiddleware } from './services/logging-middleware-service';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [
    AppController,
    MovieController,
    UserController,
    SwipeController,
  ],
  providers: [
    AppService,
    SimilarityService,
    PrismaService,
    TheMovieDb,
    FirebaseService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}

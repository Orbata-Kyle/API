import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { SimilarityService } from './services/similarity.service';
import { ConfigModule } from '@nestjs/config';
import { TheMovieDb } from './services/the-movie-db.service';
import { LoggingMiddleware } from './services/logging-middleware-service';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { MovieModule } from './modules/movie/movie.module';
import { SwipeModule } from './modules/swipe/swipe.module';
import { UserModule } from './modules/user/user.module';
import { TournamentModule } from './modules/tournament/tournament.module';
import { TournamentGraphService } from './modules/tournament/graph/tournament-graph.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({}),
    AuthModule,
    PrismaModule,
    MovieModule,
    SwipeModule,
    UserModule,
    TournamentModule,
  ],
  controllers: [AppController],
  providers: [SimilarityService, TheMovieDb, TournamentGraphService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}

import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import { LoggingMiddleware } from './services/logging-middleware-service';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { MovieModule } from './modules/movie/movie.module';
import { SwipeModule } from './modules/swipe/swipe.module';
import { UserModule } from './modules/user/user.module';
import { TournamentModule } from './modules/tournament/tournament.module';
import { MovieCacheModule } from './movie-cache/db-movie-cache.module';

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
    MovieCacheModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}

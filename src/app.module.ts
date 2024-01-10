import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import { LoggingMiddleware } from './services/logging-middleware-service';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './api-modules/auth/auth.module';
import { PrismaModule } from './utility-modules/prisma/prisma.module';
import { MovieModule } from './api-modules/movie/movie.module';
import { SwipeModule } from './api-modules/swipe/swipe.module';
import { UserModule } from './api-modules/user/user.module';
import { TournamentModule } from './api-modules/tournament/tournament.module';
import { MovieCacheModule } from './utility-modules/movie-cache/db-movie-cache.module';
import { ResponseValidationModule } from './utility-modules/validation/response-validation.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ResponseValidationModule,
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

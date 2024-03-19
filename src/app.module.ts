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
import { RecsModule } from './api-modules/recs/recs.module';
import { PeopleModule } from './api-modules/people/people.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { PugAdapter } from '@nestjs-modules/mailer/dist/adapters/pug.adapter';
import * as dotenv from 'dotenv';

dotenv.config(); // Ensure this is at the top to load env variables first

@Module({
  imports: [
    MailerModule.forRoot({
      transport: {
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_ACCOUNT,
          pass: process.env.GMAIL_PASSWORD,
        },
      },
      defaults: {
        from: '"No Reply" <omlisthelp@gmail.com>',
      },
      template: {
        dir: process.cwd() + '/email-templates/',
        adapter: new PugAdapter(),
        options: {
          strict: true,
        },
      },
    }),
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
    RecsModule,
    PeopleModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}

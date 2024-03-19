import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategy';
import { JwtAdminStrategy } from './strategy/jwt-admin.strategy';
import { MailerModule } from '@nestjs-modules/mailer';

@Module({
  imports: [JwtModule.register({}), MailerModule],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAdminStrategy],
})
export class AuthModule {}

import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaService } from '../../utility-modules/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth/auth.service';

@Module({
  controllers: [UserController],
  providers: [UserService, PrismaService, JwtService, AuthService],
})
export class UserModule {}

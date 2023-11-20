import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../../modules/auth/guard';
import { GetUser } from '../../modules/auth/decorator';
import { SafeUser } from '../../types';
import { JwtAdminGuard } from '../../modules/auth/guard/jwt-admin.guard';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  @UseGuards(JwtGuard)
  @Get()
  async retireveOwnUser(@GetUser() user: SafeUser) {
    return this.userService.retrieveOwnUser(user);
  }

  @UseGuards(JwtGuard)
  @Get('ratings')
  async retrieveOwnRatings(@GetUser('id') userId: number) {
    return this.userService.retrieveOwnRatings(userId);
  }

  @UseGuards(JwtAdminGuard)
  @Get(':id')
  async getUserById(@Param('id', ParseIntPipe) id: number) {
    return this.userService.getUserById(id);
  }
}

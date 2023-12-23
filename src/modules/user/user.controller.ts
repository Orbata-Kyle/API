import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../modules/auth/guard';
import { GetUser } from '../../modules/auth/decorator';
import { SafeUser } from '../../types';
import { JwtAdminGuard } from '../../modules/auth/guard/jwt-admin.guard';
import { UserService } from './user.service';
import { SafeUserDto, SafeUserWithRatingsDto, UserMovieRatingDto } from './dto';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  @UseGuards(JwtGuard)
  @Get()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Retrieve own user profile' })
  @ApiResponse({ status: 200, description: 'User profile', type: SafeUserDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async retireveOwnUser(@GetUser() user: SafeUser): Promise<SafeUserDto> {
    return this.userService.retrieveOwnUser(user);
  }

  @UseGuards(JwtGuard)
  @Get('ratings')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Retrieve own movie ratings' })
  @ApiResponse({ status: 200, description: 'User movie ratings', type: [UserMovieRatingDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async retrieveOwnRatings(@GetUser('id') userId: number): Promise<UserMovieRatingDto[]> {
    return this.userService.retrieveOwnRatings(userId);
  }

  @UseGuards(JwtAdminGuard)
  @Get(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get user by ID (Admin only)' })
  @ApiParam({ name: 'id', type: Number, description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User profile with ratings', type: SafeUserWithRatingsDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id', ParseIntPipe) id: number): Promise<SafeUserWithRatingsDto> {
    return this.userService.getUserById(id);
  }
}

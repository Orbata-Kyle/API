import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/guard';
import { GetUser } from '../auth/decorator';
import { SafeUser } from '../../types';
import { JwtAdminGuard } from '../auth/guard/jwt-admin.guard';
import { UserService } from './user.service';
import { SafeUserDto, SafeUserWithRatingsDto, UserMovieRatingDto } from './dto/response';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ResponseValidationService } from '../../utility-modules/validation/response-validation.service';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService, private readonly responseValidationService: ResponseValidationService) {}

  @UseGuards(JwtGuard)
  @Get()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Retrieve own user profile' })
  @ApiResponse({ status: 200, description: 'User profile', type: SafeUserDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async retireveOwnUser(@GetUser() user: SafeUser): Promise<SafeUserDto> {
    const retrievedUser = await this.userService.retrieveOwnUser(user);
    return await this.responseValidationService.validateResponse(retrievedUser, SafeUserDto);
  }

  @UseGuards(JwtGuard)
  @Get('ratings')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Retrieve own movie ratings' })
  @ApiResponse({ status: 200, description: 'User movie ratings', type: [UserMovieRatingDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async retrieveOwnRatings(@GetUser('id') userId: number): Promise<UserMovieRatingDto[]> {
    const retrievedUser = await this.userService.retrieveOwnRatings(userId);
    return await this.responseValidationService.validateArrayResponse(retrievedUser, UserMovieRatingDto);
  }

  @UseGuards(JwtAdminGuard)
  @Get(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get user by ID (Admin only)' })
  @ApiParam({ name: 'id', type: Number, description: 'User ID', required: true })
  @ApiResponse({ status: 200, description: 'User profile with ratings', type: SafeUserWithRatingsDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id', ParseIntPipe) id: number): Promise<SafeUserWithRatingsDto> {
    const retrievedUser = await this.userService.getUserById(id);
    return await this.responseValidationService.validateResponse(retrievedUser, SafeUserWithRatingsDto);
  }
}

import { Controller, Get, UseGuards } from '@nestjs/common';
import { GetUser } from '../../modules/auth/decorator';
import { JwtGuard } from '../../modules/auth/guard';
import { SwipeService } from './swipe.service';
import { ApiOperation, ApiResponse, ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MovieDto } from '../movie/dto';

@ApiTags('Swipe')
@Controller('swipe')
export class SwipeController {
  constructor(private readonly swipeService: SwipeService) {}

  @UseGuards(JwtGuard)
  @Get('next')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get Next Movie to Swipe' })
  @ApiResponse({ status: 200, description: 'Next movie to swipe', type: MovieDto })
  @ApiResponse({ status: 404, description: 'No more movies to swipe' })
  async getNextMovieToSwipe(@GetUser('id') userId: number): Promise<MovieDto> {
    return this.swipeService.getNextMovieToSwipe(userId);
  }
}

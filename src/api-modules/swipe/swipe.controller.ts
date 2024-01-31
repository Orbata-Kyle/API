import { Controller, Get, UseGuards } from '@nestjs/common';
import { GetUser } from '../auth/decorator';
import { JwtGuard } from '../auth/guard';
import { SwipeService } from './swipe.service';
import { ApiOperation, ApiResponse, ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MovieDto } from '../movie/dto/response';
import { ResponseValidationService } from '../../utility-modules/validation/response-validation.service';

@ApiTags('Swipe')
@Controller('swipe')
export class SwipeController {
  constructor(private readonly swipeService: SwipeService, private readonly responseValidationService: ResponseValidationService) {}

  @UseGuards(JwtGuard)
  @Get('next')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get Next Movie to Swipe' })
  @ApiResponse({ status: 200, description: 'Next movie to swipe', type: [MovieDto] })
  @ApiResponse({ status: 404, description: 'No more movies to swipe' })
  async getNextMovieToSwipe(@GetUser('id') userId: number): Promise<MovieDto[]> {
    const result = await this.swipeService.getNextMovieToSwipe(userId);
    return await this.responseValidationService.validateArrayResponse(result, MovieDto);
  }
}

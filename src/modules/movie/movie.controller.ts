import { BadRequestException, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { GetUser } from '../../modules/auth/decorator';
import { JwtGuard } from '../../modules/auth/guard';
import { MovieService } from './movie.service';
import { ApiOperation, ApiResponse, ApiTags, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { MovieRatingDto, MovieDto } from './dto';
import { MovieCacheService } from '../../movie-cache/db-movie-cache.service';

@ApiTags('Movie')
@Controller('movie')
export class MovieController {
  constructor(private readonly movieService: MovieService, private readonly dbMovieCache: MovieCacheService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search for a movie by title' })
  @ApiQuery({ name: 'title', type: String, description: 'Title of the movie' })
  @ApiResponse({ status: 200, description: 'Movies found', type: [MovieDto] })
  async searchForMovieByTitle(@Query('title') title: string): Promise<MovieDto[]> {
    return this.movieService.searchForMovieByTitle(title);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a movie by its ID' })
  @ApiParam({ name: 'id', type: String, description: 'ID of the movie' })
  @ApiResponse({ status: 200, description: 'Movie details', type: MovieDto })
  @ApiResponse({ status: 404, description: 'Movie not found' })
  async getMovieById(@Param('id') id: string): Promise<MovieDto> {
    return this.movieService.getMovieById(id);
  }

  @UseGuards(JwtGuard)
  @Post(':id/rate/:action')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Rate a movie' })
  @ApiParam({ name: 'id', type: String, description: 'ID of the movie' })
  @ApiParam({ name: 'action', type: String, enum: ['liked', 'disliked', 'unseen'], description: 'Rating action' })
  @ApiResponse({ status: 201, description: 'Movie rated', type: MovieRatingDto })
  @ApiResponse({ status: 400, description: 'Invalid action' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Movie not found' })
  @ApiBearerAuth('access-token')
  async rateMovieById(@Param('id') id: string, @Param('action') action: string, @GetUser('id') userId: number): Promise<MovieRatingDto> {
    // Make sure the action is valid
    if (!['liked', 'disliked', 'unseen'].includes(action)) {
      throw new BadRequestException('Invalid action');
    }

    await this.dbMovieCache.ensureMovieInDb(Number(id));

    return this.movieService.rateMovieById(id, action, userId);
  }
}

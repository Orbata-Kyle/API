import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GetUser } from '../../modules/auth/decorator';
import { JwtGuard } from '../../modules/auth/guard';
import { MovieService } from './movie.service';

@Controller('movie')
export class MovieController {
  constructor(private readonly movieService: MovieService) {}

  @Get('search')
  async searchForMovieByTitle(@Query('title') title: string) {
    return this.movieService.searchForMovieByTitle(title);
  }

  @Get(':id')
  async getMovieById(@Param('id') id: string) {
    await this.movieService.ensureMovieInDb(Number(id));

    return this.movieService.getMovieById(id);
  }

  @UseGuards(JwtGuard)
  @Post(':id/rate/:action')
  async rateMovieById(
    @Param('id') id: string,
    @Param('action') action: string,
    @GetUser('id') userId: number,
  ) {
    // Make sure the action is valid
    if (!['liked', 'disliked', 'unseen'].includes(action)) {
      throw new BadRequestException('Invalid action');
    }

    await this.movieService.ensureMovieInDb(Number(id));

    return this.movieService.rateMovieById(id, action, userId);
  }
}

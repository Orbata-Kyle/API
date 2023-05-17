import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { SimilarityService } from './similarity.service';
import { PrismaService } from './prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly similarityService: SimilarityService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('/movies')
  async getMovies() {
    const movies = await this.prisma.movie.findMany();

    return [{ movies }];
  }

  @Get('/create-movie')
  async createMockMovie() {
    const newMovie = await this.prisma.movie.create({
      data: {
        title: 'Guardians of the Galaxy: Vol 3',
      },
    });

    return newMovie;
  }

  @Post('/movies')
  addMovie(body) {
    return [];
  }
}

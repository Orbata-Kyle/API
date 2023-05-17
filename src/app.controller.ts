import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { SimilarityService } from './similarity.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly similarityService: SimilarityService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('/movies')
  getMovies() {
    const listA = [4, 5, 6];
    const listB = [7, 8, 4];

    const correlation = this.similarityService.spearmanRankCorrelation(
      listA,
      listB,
    );

    return [{ correlation }];
  }

  @Post('/movies')
  addMovie(body) {
    return [];
  }
}

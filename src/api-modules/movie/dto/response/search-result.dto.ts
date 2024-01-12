import { IsNotEmpty, IsNumber, ValidateNested } from 'class-validator';
import { MovieDto } from './movie.dto';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class SeachResultDto {
  @ValidateNested({ each: true })
  @Type(() => MovieDto)
  @ApiProperty({ type: [MovieDto], description: 'List of movies in the search' })
  movies: MovieDto[];

  @IsNumber()
  @IsNotEmpty()
  page: number;
}

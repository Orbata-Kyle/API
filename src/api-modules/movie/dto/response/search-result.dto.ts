import { IsNotEmpty, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { DetailedMovieDto } from './detailed-movie.dto';

export class SeachResultDto {
  @ValidateNested({ each: true })
  @Type(() => DetailedMovieDto)
  @ApiProperty({ type: [DetailedMovieDto], description: 'List of movies in the search' })
  movies: DetailedMovieDto[];

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ type: Number, description: 'Page number of the results' })
  page: number;
}

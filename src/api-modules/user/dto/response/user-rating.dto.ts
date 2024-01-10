import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsString, ValidateNested } from 'class-validator';

class MovieDto {
  @IsNumber()
  @ApiProperty({ type: Number, example: 123 })
  id: number;

  @IsString()
  @ApiProperty({ type: String, example: 'Inception' })
  title: string;
}

export class UserMovieRatingDto {
  @ValidateNested()
  @Type(() => MovieDto)
  @ApiProperty({ type: () => MovieDto })
  movie: MovieDto;

  @IsString()
  @ApiProperty({ type: String, example: 'liked', enum: ['liked', 'disliked', 'unseen'] })
  interactionStatus: string;
}

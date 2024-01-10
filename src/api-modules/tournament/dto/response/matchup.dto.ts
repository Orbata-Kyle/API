import { ApiProperty } from '@nestjs/swagger';
import { MovieDto } from '../../../movie/dto/response';
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class MatchupDto {
  @ValidateNested({ each: true })
  @Type(() => MovieDto)
  @ApiProperty({ type: [MovieDto], description: 'List of movies in the matchup' })
  movies: MovieDto[];

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ type: String, enum: ['liked', 'disliked'], description: 'Interaction status of the movies' })
  interactionStatus: string;
}

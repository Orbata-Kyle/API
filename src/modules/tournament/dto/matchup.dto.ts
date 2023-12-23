import { ApiProperty } from '@nestjs/swagger';
import { MovieDto } from '../../../modules/movie/dto';

export class MatchupDto {
  @ApiProperty({ type: [MovieDto], description: 'List of movies in the matchup' })
  movies: MovieDto[];

  @ApiProperty({ type: String, enum: ['liked', 'disliked'], description: 'Interaction status of the movies' })
  interactionStatus: string;
}

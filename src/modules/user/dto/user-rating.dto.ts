import { ApiProperty } from '@nestjs/swagger';

class MovieDto {
  @ApiProperty({ type: Number, example: 123 })
  id: number;

  @ApiProperty({ type: String, example: 'Inception' })
  title: string;
}

export class UserMovieRatingDto {
  @ApiProperty({ type: MovieDto })
  movie: MovieDto;

  @ApiProperty({ type: String, example: 'liked', enum: ['liked', 'disliked', 'unseen'] })
  interactionStatus: string;
}

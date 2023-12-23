import { ApiProperty } from '@nestjs/swagger';

export class MovieRatingDto {
  @ApiProperty({ type: Number, example: 1 })
  id: number;

  @ApiProperty({ type: Number, example: 123 })
  userId: number;

  @ApiProperty({ type: Number, example: 456 })
  movieId: number;

  @ApiProperty({ type: String, example: 'liked', enum: ['liked', 'disliked', 'unseen'] })
  interactionStatus: string;
}

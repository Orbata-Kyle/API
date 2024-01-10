import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class MovieRatingDto {
  @IsNumber()
  @ApiProperty({ type: Number, example: 1 })
  id: number;

  @IsNumber()
  @ApiProperty({ type: Number, example: 123 })
  userId: number;

  @IsNumber()
  @ApiProperty({ type: Number, example: 456 })
  movieId: number;

  @IsString()
  @ApiProperty({ type: String, example: 'liked', enum: ['liked', 'disliked', 'unseen'] })
  interactionStatus: string;
}

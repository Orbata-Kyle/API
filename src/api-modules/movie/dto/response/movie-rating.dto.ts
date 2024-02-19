import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsNumber, IsString } from 'class-validator';

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

  @IsDate()
  @ApiProperty({ type: Date, example: '2021-01-01T00:00:00.000Z', required: false })
  updatedAt?: Date;

  @IsDate()
  @ApiProperty({ type: Date, example: '2021-01-01T00:00:00.000Z', required: false })
  createdAt?: Date;
}

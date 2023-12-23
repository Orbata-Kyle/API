import { ApiProperty } from '@nestjs/swagger';

export class MovieDto {
  @ApiProperty({ type: Number, example: 123 })
  id: number;

  @ApiProperty({ type: String, example: 'Inception' })
  title: string;

  @ApiProperty({ type: String, example: 'https://image.tmdb.org/t/p/original/example.jpg', required: false })
  backdropUrl?: string;

  @ApiProperty({ type: String, example: 'https://image.tmdb.org/t/p/original/example.jpg', required: false })
  posterUrl?: string;

  @ApiProperty({ type: String, example: '2010-07-16', required: false })
  releaseDate?: string | Date;

  @ApiProperty({
    type: String,
    example: 'A thief who steals corporate secrets through the use of dream-sharing technology...',
    required: false,
  })
  synopsis?: string;
}

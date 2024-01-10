import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDate, IsNumber, IsOptional, IsString, IsUrl } from 'class-validator';

export class MovieDto {
  @IsNumber()
  @ApiProperty({ type: Number, example: 123 })
  id: number;

  @IsString()
  @ApiProperty({ type: String, example: 'Inception' })
  title: string;

  @IsString()
  @IsUrl()
  @IsOptional()
  @ApiProperty({ type: String, example: 'https://image.tmdb.org/t/p/original/example.jpg', required: false })
  backdropUrl?: string;

  @IsString()
  @IsUrl()
  @IsOptional()
  @ApiProperty({ type: String, example: 'https://image.tmdb.org/t/p/original/example.jpg', required: false })
  posterUrl?: string;

  @IsDate()
  @IsOptional()
  @ApiProperty({ type: Date, example: '2021-01-01T00:00:00.000Z', required: false })
  releaseDate?: Date;

  @IsString()
  @IsOptional()
  @ApiProperty({
    type: String,
    example: 'A thief who steals corporate secrets through the use of dream-sharing technology...',
    required: false,
  })
  synopsis?: string;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ type: Boolean, example: false, required: false })
  adult?: boolean;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ type: Number, example: 14, required: false })
  popularity?: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ type: Number, example: 1488, required: false })
  voteCount?: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ type: Number, example: 8.1, required: false })
  voteAverage?: number;

  @IsDate()
  @IsOptional()
  @ApiProperty({ type: Date, example: '2021-01-01T00:00:00.000Z', required: false })
  updatedAt?: Date;

  @IsDate()
  @IsOptional()
  @ApiProperty({ type: Date, example: '2021-01-01T00:00:00.000Z', required: false })
  createdAt?: Date;
}

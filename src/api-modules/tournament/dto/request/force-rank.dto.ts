import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class ForceRankDto {
  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ type: Number, example: 100, description: 'ID of the forced movie' })
  movieId: number;

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ type: Number, example: 123, description: 'ID of the movie with higher rank than the forced one' })
  aboveMovieId?: number;

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ type: Number, example: 456, description: 'ID of the movie with lower rank than the forced one' })
  belowMovieId?: number;
}

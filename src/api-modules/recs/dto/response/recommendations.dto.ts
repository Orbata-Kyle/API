import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, ValidateNested } from 'class-validator';
import { MovieWithRankDto } from '../../../tournament/dto/response';

export class RecommendationsDto {
  @ValidateNested({ each: true })
  @Type(() => MovieWithRankDto)
  @ApiProperty({ type: [MovieWithRankDto], description: 'List of movies recommended' })
  movies: MovieWithRankDto[];

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({
    type: Number,
    description: 'Accuracy based on data. 1: User rankings present, too little other users data; 2: Full accuracy',
  })
  accuracyLevel: number;
}

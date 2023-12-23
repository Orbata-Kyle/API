import { MovieDto } from '../../../modules/movie/dto';
import { ApiProperty } from '@nestjs/swagger';

export class MovieWithRankDto extends MovieDto {
  @ApiProperty({ type: String, example: '1', description: 'Rank of the movie' })
  rank: string;
}

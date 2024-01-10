import { IsNotEmpty, IsNumberString, IsString } from 'class-validator';
import { MovieDto } from '../../../movie/dto/response';
import { ApiProperty } from '@nestjs/swagger';

export class MovieWithRankDto extends MovieDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ type: String, example: '1', description: 'Rank of the movie' })
  rank: string;
}

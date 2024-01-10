import { ApiProperty } from '@nestjs/swagger';
import { UserMovieRatingDto } from './user-rating.dto';
import { SafeUserDto } from './safe-user.dto';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SafeUserWithRatingsDto extends SafeUserDto {
  @ValidateNested({ each: true })
  @Type(() => UserMovieRatingDto)
  @ApiProperty({ type: [UserMovieRatingDto] })
  UserMovieRating: UserMovieRatingDto[];
}

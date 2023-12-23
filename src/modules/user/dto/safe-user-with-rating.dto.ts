import { ApiProperty } from '@nestjs/swagger';
import { UserMovieRatingDto } from './user-rating.dto';
import { SafeUserDto } from './safe-user.dto';

export class SafeUserWithRatingsDto extends SafeUserDto {
  @ApiProperty({ type: [UserMovieRatingDto] })
  UserMovieRating: UserMovieRatingDto[];
}

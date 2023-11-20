import { IsNotEmpty, IsNumber } from 'class-validator';

export class RankDto {
  @IsNumber()
  @IsNotEmpty()
  winnerId: number;

  @IsNumber()
  @IsNotEmpty()
  loserId: number;
}

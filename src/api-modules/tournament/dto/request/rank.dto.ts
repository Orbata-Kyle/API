import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class RankDto {
  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ type: Number, example: 123, description: 'ID of the winning movie' })
  winnerId: number;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ type: Number, example: 456, description: 'ID of the losing movie' })
  loserId: number;
}

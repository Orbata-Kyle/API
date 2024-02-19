import { ApiProperty, OmitType } from '@nestjs/swagger';
import { IsBoolean, IsDate, IsInt } from 'class-validator';
import { AuthDto } from '../../../../api-modules/auth/dto/request';

export class SafeUserDto extends OmitType(AuthDto, ['password'] as const) {
  @IsInt()
  @ApiProperty({ type: Number, example: 1 })
  id: number;

  @IsBoolean()
  @ApiProperty({ type: Boolean, example: false })
  admin: boolean;

  @IsDate()
  @ApiProperty({ type: Date, example: '2021-01-01T00:00:00.000Z', required: false })
  updatedAt?: Date;

  @IsDate()
  @ApiProperty({ type: Date, example: '2021-01-01T00:00:00.000Z', required: false })
  createdAt?: Date;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDate, IsEmail, IsInt, IsNotEmpty, IsString } from 'class-validator';

export class SafeUserDto {
  @IsInt()
  @ApiProperty({ type: Number, example: 1 })
  id: number;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ type: String, example: 'John' })
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ type: String, example: 'Doe' })
  lastName: string;

  @IsString()
  @IsEmail()
  @ApiProperty({ type: String, example: 'user@example.com' })
  email: string;

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

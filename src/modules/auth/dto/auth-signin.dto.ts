import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AuthSigninDto {
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({ type: String, example: 'user@example.com', description: 'User email' })
  email: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ type: String, example: 'password123', description: 'User password' })
  password: string;
}

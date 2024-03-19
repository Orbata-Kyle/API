import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsJWT, IsNotEmpty, IsString } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  @IsJWT()
  @ApiProperty({ type: String, example: 'token', description: 'Reset token issued by forgotPassword endpoint' })
  resetToken: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ type: String, example: 'password123', description: 'User password' })
  newPassword: string;

  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({ type: String, example: 'user@example.com', description: 'User email' })
  email: string;
}

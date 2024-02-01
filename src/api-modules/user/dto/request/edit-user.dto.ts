import { IsEmail, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class EditUserDto {
  @IsEmail()
  @IsOptional()
  @ApiPropertyOptional({ type: String, example: 'user@example.com', description: 'User email' })
  email?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ type: String, example: 'password123', description: 'User password' })
  password?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ type: String, example: 'John', description: 'First name' })
  firstName?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ type: String, example: 'Doe', description: 'Last name' })
  lastName?: string;
}

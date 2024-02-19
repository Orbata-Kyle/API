import { IsDateString, IsEmail, IsMobilePhone, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { AuthDto } from '../../../../api-modules/auth/dto/request';

// The omitted props are the ones that were normally mandatory in the AuthDto, but are now optional in the EditUserDto
export class EditUserDto extends OmitType(AuthDto, ['password', 'email', 'lastName', 'firstName'] as const) {
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

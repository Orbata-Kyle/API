import { IsDateString, IsEmail, IsMobilePhone, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthDto {
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({ type: String, example: 'user@example.com', description: 'User email' })
  email: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ type: String, example: 'password123', description: 'User password' })
  password: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ type: String, example: 'John', description: 'First name' })
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ type: String, example: 'Doe', description: 'Last name' })
  lastName: string;

  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional({ type: Date, example: '2021-01-01T00:00:00.000Z', description: 'User birthday' })
  birthDate?: string;

  @IsString()
  @IsMobilePhone()
  @IsOptional()
  @ApiPropertyOptional({ type: String, example: '+4915777765590', description: 'User phone number' })
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    type: String,
    example: 'Woman',
    description: 'Users gender',
    enum: ['Woman', 'Man', 'Transgender', 'Non-binary', 'Other', 'Prefer not to say'],
  })
  gender?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ type: String, example: 'US', description: 'User country' })
  country?: string;
}

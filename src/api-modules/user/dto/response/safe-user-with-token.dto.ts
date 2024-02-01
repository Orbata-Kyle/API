import { ApiPropertyOptional } from '@nestjs/swagger';
import { SafeUserDto } from './safe-user.dto';
import { IsJWT, IsOptional, IsString } from 'class-validator';

export class SafeUserWithTokenDto extends SafeUserDto {
  @IsString()
  @IsJWT()
  @IsOptional()
  @ApiPropertyOptional({ type: String, example: 'someaccesstoken' })
  access_token?: string;
}

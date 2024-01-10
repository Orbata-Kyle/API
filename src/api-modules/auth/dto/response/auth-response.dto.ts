import { ApiProperty } from '@nestjs/swagger';
import { IsJWT, IsNotEmpty, IsString } from 'class-validator';
import { SafeUserDto } from '../../../../api-modules/user/dto/response';

export class AuthResponseDto extends SafeUserDto {
  @IsString()
  @IsJWT()
  @IsNotEmpty()
  @ApiProperty({ type: String, example: 'someaccesstoken' })
  access_token: string;
}

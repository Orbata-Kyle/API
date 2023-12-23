import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDto, AuthResponseDto, AuthSigninDto } from './dto';
import { ApiOperation, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  @Post('signup')
  @ApiOperation({ summary: 'User Signup' })
  @ApiResponse({ status: 201, description: 'User successfully registered', type: AuthResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden - Email already taken' })
  @ApiBody({ type: AuthDto })
  signup(@Body() dto: AuthDto): Promise<AuthResponseDto> {
    return this.authService.signup(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('signin')
  @ApiOperation({ summary: 'User Signin' })
  @ApiResponse({ status: 200, description: 'User successfully logged in', type: AuthResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden - User not found or password incorrect' })
  @ApiBody({ type: AuthSigninDto })
  signin(@Body() dto: AuthSigninDto): Promise<AuthResponseDto> {
    return this.authService.signin(dto);
  }
}

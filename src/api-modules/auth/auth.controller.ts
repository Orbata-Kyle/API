import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDto, AuthSigninDto } from './dto/request';
import { AuthResponseDto } from './dto/response';
import { ApiOperation, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger';
import { ResponseValidationService } from '../../utility-modules/validation/response-validation.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService, private readonly responseValidationService: ResponseValidationService) {}

  @Post('signup')
  @ApiOperation({ summary: 'User Signup' })
  @ApiResponse({ status: 201, description: 'User successfully registered', type: AuthResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden - Email already taken' })
  @ApiBody({ type: AuthDto, required: true })
  async signup(@Body() dto: AuthDto): Promise<AuthResponseDto> {
    const result = await this.authService.signup(dto);
    return this.responseValidationService.validateResponse(result, AuthResponseDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('signin')
  @ApiOperation({ summary: 'User Signin' })
  @ApiResponse({ status: 200, description: 'User successfully logged in', type: AuthResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden - User not found or password incorrect' })
  @ApiBody({ type: AuthSigninDto, required: true })
  async signin(@Body() dto: AuthSigninDto): Promise<AuthResponseDto> {
    const result = await this.authService.signin(dto);
    return this.responseValidationService.validateResponse(result, AuthResponseDto);
  }
}
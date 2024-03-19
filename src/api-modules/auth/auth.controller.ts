import { BadRequestException, Body, Controller, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDto, AuthSigninDto, ResetPasswordDto } from './dto/request';
import { AuthResponseDto } from './dto/response';
import { ApiOperation, ApiResponse, ApiTags, ApiBody, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ResponseValidationService } from '../../utility-modules/validation/response-validation.service';
import { JwtGuard } from './guard';
import { GetUser } from './decorator';
import { SafeUser } from 'src/types';
import { IsEmail } from 'class-validator';
import { ValidateEmailPipe } from 'src/pipes/email.pipe';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService, private readonly responseValidationService: ResponseValidationService) {}

  @Post('signup')
  @ApiOperation({ summary: 'User Signup' })
  @ApiResponse({ status: 201, description: 'User successfully registered', type: AuthResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Email already taken' })
  @ApiBody({ type: AuthDto, required: true })
  async signup(@Body() dto: AuthDto): Promise<AuthResponseDto> {
    const possibleGenders = ['Woman', 'Man', 'Transgender', 'Non-binary', 'Other', 'Prefer not to say'];
    if (dto.gender && !possibleGenders.includes(dto.gender)) {
      throw new BadRequestException(`Gender not one of ${possibleGenders}`);
    }

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

  @Post('forgotPassword')
  @ApiQuery({ name: 'email', type: String, description: 'Email of the user', required: true })
  @ApiOperation({ summary: 'Send email with password reset link' })
  @ApiResponse({ status: 200, description: 'Email sent' })
  @ApiResponse({ status: 400, description: 'Bad email' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async forgotPassword(@Query('email', ValidateEmailPipe) email: string): Promise<string> {
    return await this.authService.forgotPassword(email);
  }

  @Post('resetPassword')
  @ApiOperation({ summary: 'Reset password with resetToken' })
  @ApiResponse({ status: 200, description: 'Password reset' })
  @ApiResponse({ status: 400, description: 'Bad resetToken or invalid body' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBody({ type: ResetPasswordDto, required: true })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<string> {
    return await this.authService.resetPassword(dto.email, dto.resetToken, dto.newPassword);
  }
}

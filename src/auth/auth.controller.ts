import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Request, Response } from 'express';
import { RegisterDto } from './dto/register.dto';
import { Body } from '@nestjs/common';
import { LoginDTO } from './dto/login.dto';
import { ChangePasswordAuthDTO } from './dto/change-password-auth.dto';
import { VerifyResetOtpDto } from './dto/verify-reset-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiCookieAuth,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GitHubAuthGuard } from './guards/github.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { FacebookAuthGuard } from './guards/facebook.guard';
import { JwtAuthGuard } from './guards/jwt.guard';
import { ResponseMessage } from 'src/decorators/response-message.decorator';
import { GetUserId } from 'src/decorators/get-userId.decorator';
import {
  captchaSwagger,
  changePasswordSwagger,
  facebookCallbackSwagger,
  facebookOauthSwagger,
  generateOTPSwagger,
  githubCallbackSwagger,
  githubOauthSwagger,
  googleCallbackSwagger,
  googleOauthSwagger,
  loginSwagger,
  notMeSwagger,
  refreshTokenSwagger,
  registerUserSwagger,
  verifyEmailSwagger,
  forgetPasswordSwagger,
  verifyResetOtpSwagger,
  resetPasswordSwagger,
} from './auth.swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private httpnOnlyRefreshToken(response: Response, refresh: string) {
    response.cookie('refresh_token', refresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  @ApiOperation(registerUserSwagger.operation)
  @ApiBody({ type: RegisterDto })
  @ApiResponse(registerUserSwagger.responses.success)
  @ApiResponse(registerUserSwagger.responses.BadRequest)
  @ApiResponse(registerUserSwagger.responses.conflict)
  @ResponseMessage('User successfully registered. Check email for verification')
  @Post('signup')
  async signup(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @ApiOperation(generateOTPSwagger.operation)
  @ApiBody(generateOTPSwagger.body)
  @ApiResponse(generateOTPSwagger.responses.success)
  @ApiResponse(generateOTPSwagger.responses.NotFound)
  @ResponseMessage('OTP generated and sent successfully')
  @Post('resend-otp')
  async generateEmailVerification(@Body() body: {
    email: string
  }) {
    const { email } = body;
    return this.authService.generateEmailVerification(email);
  }

  @ApiOperation(verifyEmailSwagger.operation)
  @ApiBody(verifyEmailSwagger.body)
  @ApiResponse(verifyEmailSwagger.responses.success)
  @ApiResponse(verifyEmailSwagger.responses.BadRequest)
  @ResponseMessage('Email verified successfully')
  @Post('email/verify-otp')
  async verifyEmail(@Body() body: { email: string; token: string }) {
    const { email, token } = body;
    return this.authService.verifyEmail(email, token);
  }

  @ApiOperation(notMeSwagger.operation)
  @ApiQuery({
    name: 'token',
    type: String,
    required: true,
    description: 'The JWT token from the link sent to the user’s email.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ApiResponse(notMeSwagger.responses.success)
  @ApiResponse(notMeSwagger.responses.Unauthorized)
  @ApiResponse(notMeSwagger.responses.BadRequest)
  @ResponseMessage('Account successfully removed due to unauthorized access report')
  @Get('not-me')
  async handleNotMe(@Query('token') token: string) {
    return this.authService.handleNotMe(token);
  }

  @ApiOperation(loginSwagger.operation)
  @ApiBody({ type: LoginDTO })
  @ApiResponse(loginSwagger.responses.success)
  @ApiResponse(loginSwagger.responses.Unauthorized)
  @ApiResponse(loginSwagger.responses.Forbidden)
  @ResponseMessage('Logged in Successfully! ')
  @Post('login')
  async login(
    @Body() loginDTO: LoginDTO,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { access_token, refresh_token, user } =
      await this.authService.login(loginDTO);

    this.httpnOnlyRefreshToken(response, refresh_token);
    return { access_token, user };
  }

  @ApiOperation(refreshTokenSwagger.operation)
  @ApiCookieAuth('refresh_token')
  @ApiResponse(refreshTokenSwagger.responses.success)
  @ApiResponse(refreshTokenSwagger.responses.BadRequest)
  @ApiResponse(refreshTokenSwagger.responses.Unauthorized)
  @ResponseMessage('New access token generated')
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = req.cookies['refresh_token'];
    if (!refreshToken)
      throw new BadRequestException('No refresh token provided');

    const { access_token, refresh_token } =
      await this.authService.refresh(refreshToken);
    this.httpnOnlyRefreshToken(response, refresh_token);
    return { access_token };
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout from current device' })
  @ApiCookieAuth('refresh_token')
  @ApiResponse({ status: 200, description: 'Successfully logged out from this device' })
  @ApiResponse({ status: 400, description: 'No refresh token provided' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = req.cookies['refresh_token'];
    if (!refreshToken)
      throw new BadRequestException('No refresh token provided');
    return await this.authService.logout(refreshToken, response);
  }

  @Post('logout-all')
  @ApiOperation({ summary: 'Logout from all devices' })
  @ApiCookieAuth('refresh_token')
  @ApiResponse({ status: 200, description: 'Successfully logged out from all devices' })
  @ApiResponse({ status: 400, description: 'No refresh token provided' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async logoutAll(
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = req.cookies['refresh_token'];
    if (!refreshToken)
      throw new BadRequestException('No refresh token provided');
    return await this.authService.logoutAll(refreshToken, response);
  }

  @ApiOperation(changePasswordSwagger.operation)
  @ApiBearerAuth('JWT-auth')
  @ApiBody({ type: ChangePasswordAuthDTO })
  @ApiResponse(changePasswordSwagger.responses.success)
  @ApiResponse(changePasswordSwagger.responses.BadRequest)
  @ApiResponse(changePasswordSwagger.responses.Unauthorized)
  @ApiResponse(changePasswordSwagger.responses.NotFound)
  @ResponseMessage('Password changed successfully')
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(@Body() body: ChangePasswordAuthDTO, @GetUserId() userId: string) {
    const { old_password, new_password } = body;
    return this.authService.changePassword(userId, old_password, new_password);
  }

  @ApiBearerAuth('JWT-auth')
  @ApiOperation(forgetPasswordSwagger.operation)
  @ApiResponse(forgetPasswordSwagger.responses.success)
  @ApiResponse(forgetPasswordSwagger.responses.NotFound)
  @ApiResponse(forgetPasswordSwagger.responses.InternalServerError)
  @Get('forget-password')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Password reset OTP sent to your email')
  async forgetPassword(@GetUserId() userId: string) {
    return this.authService.sendResetPasswordEmail(userId);
  }

  @ApiBearerAuth('JWT-auth')
  @ApiOperation(verifyResetOtpSwagger.operation)
  @ApiBody({ type: VerifyResetOtpDto })  
  @ApiResponse(verifyResetOtpSwagger.responses.success)
  @ApiResponse(verifyResetOtpSwagger.responses.BadRequest)
  @ApiResponse(verifyResetOtpSwagger.responses.NotFound)
  @Post('password/verify-otp')
  @ResponseMessage('OTP verified successfully, you can now reset your password')
  @UseGuards(JwtAuthGuard)
  async verifyResetPasswordOtp(@Body() body: { token: string }, @GetUserId() userId: string) {
    const { token } = body;
    return this.authService.verifyResetPasswordOtp(userId, token);
  }

  @ApiBearerAuth('JWT-auth')
  @ApiOperation(resetPasswordSwagger.operation)
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse(resetPasswordSwagger.responses.success)
  @ApiResponse(resetPasswordSwagger.responses.BadRequest)
  @ApiResponse(resetPasswordSwagger.responses.NotFound)
  @ApiResponse(resetPasswordSwagger.responses.UnprocessableEntity)
  @ResponseMessage('Password reset successfully')
  @UseGuards(JwtAuthGuard)
  @Post('reset-password')
  async resetPassword(
    @GetUserId() userId: string,
    @Body() body: ResetPasswordDto,
  ) {
    const { new_password, reset_token } = body;
    return this.authService.resetPassword(userId, new_password, reset_token);
  }

  /* 
      ######################### Google OAuth Routes #########################
  */

  @ApiOperation(googleOauthSwagger.operation)
  @ApiResponse(googleOauthSwagger.responses.success)
  @ApiResponse(googleOauthSwagger.responses.InternalServerError)
  @UseGuards(GoogleAuthGuard)
  @Get('google')
  googleLogin() {}


  @ApiOperation(googleCallbackSwagger.operation)
  @ApiResponse(googleCallbackSwagger.responses.success)
  @ApiResponse(googleCallbackSwagger.responses.AuthFail)
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  async googleLoginCallback(@Req() req, @Res() res) {
    try {
      const { access_token, refresh_token } =
        await this.authService.generateTokens(req.user.id);

      // Set refresh token in HTTP-only cookie
      this.httpnOnlyRefreshToken(res, refresh_token);

      // Redirect to frontend with access token
      const frontendUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/success?token=${access_token}`;
      return res.redirect(frontendUrl);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      return res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/error?message=Authentication%20failed`,
      );
    }
  }

  /* 
      ######################### Facebook OAuth Routes #########################
  */

  @ApiOperation(facebookOauthSwagger.operation)
  @ApiResponse(facebookOauthSwagger.responses.success)
  @ApiResponse(facebookOauthSwagger.responses.InternalServerError)
  @UseGuards(FacebookAuthGuard)
  @Get('facebook')
  facebookLogin() {}

  @ApiOperation(facebookCallbackSwagger.operation)
  @ApiResponse(facebookCallbackSwagger.responses.success)
  @ApiResponse(facebookCallbackSwagger.responses.AuthFail)
  @UseGuards(FacebookAuthGuard)
  @Get('facebook/callback')
  async facebookLoginCallback(@Req() req, @Res() res) {
    try {
      const { access_token, refresh_token } =
        await this.authService.generateTokens(req.user.id);

      // Set refresh token in HTTP-only cookie
      this.httpnOnlyRefreshToken(res, refresh_token);

      // Redirect to frontend with access token
      const frontendUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/success?token=${access_token}`;
      return res.redirect(frontendUrl);
    } catch (error) {
      console.error('Facebook OAuth callback error:', error);
      return res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/error?message=Authentication%20failed`,
      );
    }
  }

  /* 
      ######################### GitHub OAuth Routes #########################
  */

  @ApiOperation(githubOauthSwagger.operation)
  @ApiResponse(githubOauthSwagger.responses.success)
  @ApiResponse(githubOauthSwagger.responses.InternalServerError)
  @Get('github')
  @UseGuards(GitHubAuthGuard)
  async githubLogin() {}


  @ApiOperation(githubCallbackSwagger.operation)
  @ApiResponse(githubCallbackSwagger.responses.success)
  @ApiResponse(githubCallbackSwagger.responses.AuthFail)
  @Get('github/callback')
  @UseGuards(GitHubAuthGuard)
  async githubCallback(
    @Req() req: any,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      const { access_token, refresh_token } =
        await this.authService.generateTokens(req.user.id);
      this.httpnOnlyRefreshToken(response, refresh_token);

      // Redirect to frontend with access token
      const frontendUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/success?token=${access_token}`;
      response.redirect(frontendUrl);
    } catch (error) {
      console.error('GitHub OAuth callback error:', error);
      return response.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/error?message=Authentication%20failed`,
      );
    }
  }

  /* 
      ######################### ReCAPTCHA Routes #########################
  */

  @ApiOperation(captchaSwagger.operation)
  @ApiResponse(captchaSwagger.responses.success)
  @ResponseMessage('ReCAPTCHA site key retrieved successfully')
  @Get('captcha/site-key')
  getCaptchaSiteKey() {
    return {
      siteKey: process.env.RECAPTCHA_SITE_KEY || '',
    };
  }
}

import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Request, Response } from 'express';
import { RegisterDto } from './dto/register.dto';
import { Body } from '@nestjs/common';
import { LoginDTO } from './dto/login.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { GitHubAuthGuard } from './guards/github.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { FacebookAuthGuard } from './guards/facebook.guard';
import { ResponseMessage } from 'src/decorators/response-message.decorator';
import {
  captchaSwagger,
  facebookCallbackSwagger,
  facebookOauthSwagger,
  generateOTPSwagger,
  githubCallbackSwagger,
  githubOauthSwagger,
  googleCallbackSwagger,
  googleOauthSwagger,
  loginSwagger,
  refreshTokenSwagger,
  registerUserSwagger,
  verifyEmailSwagger,
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
  @ApiParam(generateOTPSwagger.params)
  @ApiResponse(generateOTPSwagger.responses.success)
  @ApiResponse(generateOTPSwagger.responses.NotFound)
  @ResponseMessage('OTP generated and sent successfully')
  @Post('verification-otp/:userId')
  async generateEmailVerification(@Param('userId') userId: string) {
    return this.authService.generateEmailVerification(userId);
  }

  @ApiOperation(verifyEmailSwagger.operation)
  @ApiBody(verifyEmailSwagger.body)
  @ApiResponse(verifyEmailSwagger.responses.success)
  @ApiResponse(verifyEmailSwagger.responses.BadRequest)
  @ResponseMessage('Email verified successfully')
  @Post('verify')
  async verifyEmail(@Body() body: { userId: string; token: string }) {
    const { userId, token } = body;
    return this.authService.verifyEmail(userId, token);
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
  @Get('captcha/site-key')
  getCaptchaSiteKey() {
    return {
      siteKey: process.env.RECAPTCHA_SITE_KEY || '',
    };
  }
}

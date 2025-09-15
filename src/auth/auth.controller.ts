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
import { GoogleAuthGuard } from './guards/google-auth/google-auth.guard';

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

  @ApiOperation({
    summary: 'Register new user',
    description:
      'Register a new user account. User will need to verify email before login.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered. Check email for verification.',
    schema: {
      example: {
        email: true,
        message: 'User registered successfully',
        userId: 1,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation errors',
    schema: {
      example: {
        message: ['email must be a valid email', 'password is too weak'],
        error: 'Bad Request',
        statusCode: 400,
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - email already exists',
    schema: {
      example: {
        message: 'Email already exists',
        error: 'Conflict',
        statusCode: 409,
      },
    },
  })
  @Post('signup')
  async signup(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @ApiOperation({
    summary: 'Generate email verification OTP',
    description:
      "Generate and send a new email verification OTP to the user's email.",
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID to generate OTP for',
    type: 'string',
    example: '62dd7691-a048-46e4-8579-43278e1a35b6',
  })
  @ApiResponse({
    status: 201,
    description: 'OTP generated and sent successfully',
    schema: {
      example: {
        message: 'Verification OTP sent to email',
        success: true,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    schema: {
      example: {
        message: 'User not found',
        error: 'Not Found',
        statusCode: 404,
      },
    },
  })
  @Post('verification-otp/:userId')
  async generateEmailVerification(@Param('userId') userId: string) {
    return this.authService.generateEmailVerification(userId);
  }

  @ApiOperation({
    summary: 'Verify email with OTP',
    description: 'Verify user email using the OTP sent to their email address.',
  })
  @ApiBody({
    description: 'Verification data',
    schema: {
      type: 'object',
      properties: {
        userId: {
          type: 'number',
          description: 'User ID',
          example: 1,
        },
        token: {
          type: 'string',
          description: 'OTP token received in email',
          example: '123456',
        },
      },
      required: ['userId', 'token'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    schema: {
      example: {
        message: 'Email verified successfully',
        verified: true,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired OTP',
    schema: {
      example: {
        message: 'Invalid or expired OTP',
        error: 'Bad Request',
        statusCode: 400,
      },
    },
  })
  @Post('verify')
  async verifyEmail(@Body() body: { userId: string; token: string }) {
    const { userId, token } = body;
    return this.authService.verifyEmail(userId, token);
  }

  @ApiOperation({
    summary: 'User login',
    description:
      'Authenticate user and receive access token. Refresh token is set as httpOnly cookie.',
  })
  @ApiBody({ type: LoginDTO })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
    headers: {
      'Set-Cookie': {
        description: 'HttpOnly cookie containing refresh token',
        schema: {
          type: 'string',
          example:
            'refresh_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure; SameSite=Strict',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid credentials',
    schema: {
      example: {
        message: 'Invalid email or password',
        error: 'Unauthorized',
        statusCode: 401,
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - email not verified',
    schema: {
      example: {
        message: 'Please verify your email first',
        error: 'Forbidden',
        statusCode: 403,
      },
    },
  })
  @Post('login')
  async login(
    @Body() loginDTO: LoginDTO,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { access_token, refresh_token } =
      await this.authService.login(loginDTO);

    this.httpnOnlyRefreshToken(response, refresh_token);
    return { access_token };
  }

  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Use refresh token from httpOnly cookie to get a new access token.',
  })
  @ApiCookieAuth('refresh_token')
  @ApiResponse({
    status: 200,
    description: 'New access token generated',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
    headers: {
      'Set-Cookie': {
        description: 'New HttpOnly cookie containing refresh token',
        schema: {
          type: 'string',
          example:
            'refresh_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure; SameSite=Strict',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - no refresh token provided',
    schema: {
      example: {
        message: 'No refresh token provided',
        error: 'Bad Request',
        statusCode: 400,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or expired refresh token',
    schema: {
      example: {
        message: 'Invalid refresh token',
        error: 'Unauthorized',
        statusCode: 401,
      },
    },
  })
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

  //google oauth

  @UseGuards(GoogleAuthGuard)
  @Get('google/login')
  googleLogin() {}

  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  async googleLoginCallback(@Req() req, @Res() res) {
    try {
      const { access_token, refresh_token } =
        await this.authService.generateTokens(req.user.id);

      // Set refresh_token in HTTP-only cookie
      this.httpnOnlyRefreshToken(res, refresh_token);

      //TODO: to be implemented in the next push

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/auth/success`);
    } catch (err) {}
  }

  /* 
      ######################### GitHub OAuth Routes #########################
  */

  @ApiOperation({
    summary: 'Login with GitHub',
    description:
      'Initiate GitHub OAuth login. Redirects user to GitHub for authentication.',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to GitHub OAuth page',
  })
  @Get('github')
  @UseGuards(GitHubAuthGuard)
  async githubLogin() {}

  @ApiOperation({
    summary: 'GitHub OAuth callback',
    description:
      'GitHub redirects here after user authorizes the app. Sets tokens and redirects to frontend.',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to frontend with access token',
  })
  @Get('github/callback')
  @UseGuards(GitHubAuthGuard)
  async githubCallback(
    @Req() req: any,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { access_token, refresh_token } =
      await this.authService.generateTokens(req.user.id);
    this.httpnOnlyRefreshToken(response, refresh_token);

    // Redirect to frontend with access token (no front url for now)
    const frontendUrl = `http://localhost:3001/auth/success?token=${access_token}`;
    response.redirect(frontendUrl);
  }

  /* 
      ######################### ReCAPTCHA Routes #########################
  */

  @ApiOperation({
    summary: 'Get reCAPTCHA site key',
    description:
      'Returns the reCAPTCHA site key needed for frontend widget initialization.',
  })
  @ApiResponse({
    status: 200,
    description: 'reCAPTCHA site key returned successfully',
    schema: {
      example: {
        siteKey: '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI',
      },
    },
  })
  @Get('captcha/site-key')
  getCaptchaSiteKey() {
    return {
      siteKey: process.env.RECAPTCHA_SITE_KEY || '',
    };
  }
}

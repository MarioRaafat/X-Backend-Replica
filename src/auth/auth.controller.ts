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
          type: 'string',
          description: 'User ID',
          example: 'f3199dfb-8eaf-49c1-b07d-b532d6bfb3f1',
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



  /* 
      ######################### Google OAuth Routes #########################
  */

  @ApiOperation({
    summary: 'Initiate Google OAuth Login',
    description: `
    **⚠️ Important: This endpoint cannot be tested in Swagger UI**
    
    **How to use:**
    1. Open your browser and navigate to: \`<back url>/auth/google\`
    2. You will be redirected to Google's OAuth consent screen
    3. Sign in with your Google account and grant permissions
    4. Google will redirect you back to the callback URL
    5. You'll be automatically redirected to the frontend with an access token
    
    **What happens:**
    - Redirects user to Google OAuth authorization page
    - User signs in with Google credentials
    - Google redirects back to /auth/google/callback
    - System creates/finds user account and generates JWT tokens
    - User is redirected to frontend with access token in URL
    - Refresh token is set as httpOnly cookie
    
    **Frontend URL format:** \`<front url>/auth/success?token={access_token}\`
    `,
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Google OAuth authorization page',
    headers: {
      Location: {
        description: 'Google OAuth URL',
        schema: {
          type: 'string',
          example: 'https://accounts.google.com/oauth/authorize?client_id=...',
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - OAuth configuration issue',
    schema: {
      example: {
        message: 'OAuth configuration error',
        error: 'Internal Server Error',
        statusCode: 500,
      },
    },
  })
  @UseGuards(GoogleAuthGuard)
  @Get('google')
  googleLogin() {}

  @ApiOperation({
    summary: 'Google OAuth Callback Handler',
    description: `
    **⚠️ This endpoint is called automatically by Google - Do not call manually**
    
    **What this endpoint does:**
    1. Receives authorization code from Google
    2. Exchanges code for user profile information
    3. Creates new user account OR finds existing user by email
    4. Generates JWT access token and refresh token
    5. Sets refresh token as httpOnly cookie
    6. Redirects to frontend with access token
    
    **Automatic redirect URL:** \`<front url>/auth/success?token={jwt_access_token}\`
    
    **Error redirect URL:** \`<front url>/auth/error?message=Authentication%20failed\`
    
    **Cookies set:**
    - \`refresh_token\`: HttpOnly, Secure, SameSite=Strict, 7 days expiry
    `,
  })
  @ApiResponse({
    status: 302,
    description: 'Successful authentication - redirects to frontend with token',
    headers: {
      Location: {
        description: 'Frontend success URL with access token',
        schema: {
          type: 'string',
          example: '<front url>/auth/success?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
      'Set-Cookie': {
        description: 'HttpOnly refresh token cookie',
        schema: {
          type: 'string',
          example: 'refresh_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure; SameSite=Strict; Max-Age=604800',
        },
      },
    },
  })
  @ApiResponse({
    status: 302,
    description: 'Authentication failed - redirects to frontend error page',
    headers: {
      Location: {
        description: 'Frontend error URL',
        schema: {
          type: 'string',
          example: '<front url>/auth/error?message=Authentication%20failed',
        },
      },
    },
  })
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

  @ApiOperation({
    summary: 'Initiate Facebook OAuth Login',
    description: `
    **⚠️ Important: This endpoint cannot be tested in Swagger UI**
    
    **How to use:**
    1. Open your browser and navigate to: \`<back url>/auth/facebook\`
    2. You will be redirected to Facebook's OAuth consent screen
    3. Sign in with your Facebook account and grant permissions
    4. Facebook will redirect you back to the callback URL
    5. You'll be automatically redirected to the frontend with an access token
    
    **What happens:**
    - Redirects user to Facebook OAuth authorization page
    - User signs in with Facebook credentials
    - Facebook redirects back to /auth/facebook/callback
    - System creates/finds user account and generates JWT tokens
    - User is redirected to frontend with access token in URL
    - Refresh token is set as httpOnly cookie
    
    **Frontend URL format:** \`<front url>/auth/success?token={access_token}\`
    `,
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Facebook OAuth authorization page',
    headers: {
      Location: {
        description: 'Facebook OAuth URL',
        schema: {
          type: 'string',
          example: 'https://www.facebook.com/v18.0/dialog/oauth?client_id=...',
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - OAuth configuration issue',
    schema: {
      example: {
        message: 'OAuth configuration error',
        error: 'Internal Server Error',
        statusCode: 500,
      },
    },
  })
  @UseGuards(FacebookAuthGuard)
  @Get('facebook')
  facebookLogin() {}

  @ApiOperation({
    summary: 'Facebook OAuth Callback Handler',
    description: `
    **⚠️ This endpoint is called automatically by Facebook - Do not call manually**
    
    **What this endpoint does:**
    1. Receives authorization code from Facebook
    2. Exchanges code for user profile information
    3. Creates new user account OR finds existing user by email
    4. Generates JWT access token and refresh token
    5. Sets refresh token as httpOnly cookie
    6. Redirects to frontend with access token
    
    **Automatic redirect URL:** \`<front url>/auth/success?token={jwt_access_token}\`
    
    **Error redirect URL:** \`<front url>/auth/error?message=Authentication%20failed\`
    
    **Cookies set:**
    - \`refresh_token\`: HttpOnly, Secure, SameSite=Strict, 7 days expiry
    `,
  })
  @ApiResponse({
    status: 302,
    description: 'Successful authentication - redirects to frontend with token',
    headers: {
      Location: {
        description: 'Frontend success URL with access token',
        schema: {
          type: 'string',
          example: '<front url>/auth/success?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
      'Set-Cookie': {
        description: 'HttpOnly refresh token cookie',
        schema: {
          type: 'string',
          example: 'refresh_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure; SameSite=Strict; Max-Age=604800',
        },
      },
    },
  })
  @ApiResponse({
    status: 302,
    description: 'Authentication failed - redirects to frontend error page',
    headers: {
      Location: {
        description: 'Frontend error URL',
        schema: {
          type: 'string',
          example: '<front url>/auth/error?message=Authentication%20failed',
        },
      },
    },
  })
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

  @ApiOperation({
    summary: 'Initiate GitHub OAuth Login',
    description: `
    **⚠️ Important: This endpoint cannot be tested in Swagger UI**
    
    **How to use:**
    1. Open your browser and navigate to: \`<back url>/auth/github\`
    2. You will be redirected to GitHub's OAuth consent screen
    3. Sign in with your GitHub account and authorize the application
    4. GitHub will redirect you back to the callback URL
    5. You'll be automatically redirected to the frontend with an access token
    
    **What happens:**
    - Redirects user to GitHub OAuth authorization page
    - User signs in with GitHub credentials and grants permissions
    - GitHub redirects back to /auth/github/callback
    - System creates/finds user account and generates JWT tokens
    - User is redirected to frontend with access token in URL
    - Refresh token is set as httpOnly cookie
    
    **Frontend URL format:** \`<front url>/auth/success?token={access_token}\`
    `,
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to GitHub OAuth authorization page',
    headers: {
      Location: {
        description: 'GitHub OAuth URL',
        schema: {
          type: 'string',
          example: 'https://github.com/login/oauth/authorize?client_id=...',
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - OAuth configuration issue',
    schema: {
      example: {
        message: 'OAuth configuration error',
        error: 'Internal Server Error',
        statusCode: 500,
      },
    },
  })
  @Get('github')
  @UseGuards(GitHubAuthGuard)
  async githubLogin() {}

  @ApiOperation({
    summary: 'GitHub OAuth Callback Handler',
    description: `
    **⚠️ This endpoint is called automatically by GitHub - Do not call manually**
    
    **What this endpoint does:**
    1. Receives authorization code from GitHub
    2. Exchanges code for user profile information
    3. Creates new user account OR finds existing user by GitHub ID/email
    4. Generates JWT access token and refresh token
    5. Sets refresh token as httpOnly cookie
    6. Redirects to frontend with access token
    
    **Automatic redirect URL:** \`<front url>/auth/success?token={jwt_access_token}\`
    
    **Error redirect URL:** \`<front url>/auth/error?message=Authentication%20failed\`
    
    **Cookies set:**
    - \`refresh_token\`: HttpOnly, Secure, SameSite=Strict, 7 days expiry
    `,
  })
  @ApiResponse({
    status: 302,
    description: 'Successful authentication - redirects to frontend with token',
    headers: {
      Location: {
        description: 'Frontend success URL with access token',
        schema: {
          type: 'string',
          example: '<front url>/auth/success?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
      'Set-Cookie': {
        description: 'HttpOnly refresh token cookie',
        schema: {
          type: 'string',
          example: 'refresh_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure; SameSite=Strict; Max-Age=604800',
        },
      },
    },
  })
  @ApiResponse({
    status: 302,
    description: 'Authentication failed - redirects to frontend error page',
    headers: {
      Location: {
        description: 'Frontend error URL',
        schema: {
          type: 'string',
          example: '<front url>/auth/error?message=Authentication%20failed',
        },
      },
    },
  })
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

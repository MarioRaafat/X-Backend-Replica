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
import { GoogleAuthGuard } from './guards/google-auth/google-auth.guard';

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

  @Post('signup')
  async signup(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('verification-otp/:userId')
  async generateEmailVerification(@Param('userId') userId: number) {
    return this.authService.generateEmailVerification(userId);
  }

  @Post('verify')
  async verifyEmail(@Body() body: { userId: number; token: string }) {
    const { userId, token } = body;
    return this.authService.verifyEmail(userId, token);
  }

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
  googleLoginCallback(@Req() req, @Res() res) {
    try {
      const { access_token, refresh_token } = this.authService.generateToken(
        req.user.id,
      );

      // Set refresh_token in HTTP-only cookie
      this.httpnOnlyRefreshToken(res, refresh_token);

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/auth/success`);
    } catch (err) {}
  }
}

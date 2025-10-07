import { BadRequestException, Injectable } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';
import {generateRandomOtp} from './utils/otp.util';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class VerificationService {
  constructor(
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
  ) {}

  async generateOtp(
    identifier: string, // email or userId
    type: 'email' | 'password',
    size = 6,
  ): Promise<string> {
    const recentToken = await this.redisService.hget(
      `otp:${type}:${identifier}`,
    );

    const now = new Date();

    if (recentToken) {
      const createdAt = new Date(recentToken.createdAt);
      const oneMinuteInMs = 60 * 1000;
      const isOneMinutePassed =
        now.getTime() - createdAt.getTime() >= oneMinuteInMs;

      if (!isOneMinutePassed) {
        throw new BadRequestException(
          'Please wait a minute before requesting a new code',
        );
      }
    }

    const otp = generateRandomOtp(size);
    const hashedToken = await bcrypt.hash(otp, 10);

    await this.redisService.hset(`otp:${type}:${identifier}`, {
      token: hashedToken,
      createdAt: now.toISOString(),
    });

    return otp;
  }

  async validateOtp(
    identifier: string, // email or userId
    token: string,
    type: string,
  ): Promise<boolean> {
    const validToken = await this.redisService.hget(
      `otp:${type}:${identifier}`,
    );

    if (validToken && (await bcrypt.compare(token, validToken.token))) {
      await this.redisService.del(`otp:${type}:${identifier}`);
      return true;
    } else {
      return false;
    }
  }

  async generateNotMeLink(email: string, baseUrl: string): Promise<string> {
    const payload = { email };
    const token = await this.jwtService.signAsync(payload, {
      expiresIn: process.env.NOT_ME_LINK_EXPIRATION_TIME || '15m',
      secret: process.env.NOT_ME_LINK_SECRET || 'secret-key',
    });

    return `${baseUrl}?token=${encodeURIComponent(token)}`;
  }

  async validateNotMeLink(token: string): Promise<{ email: string } | null> {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.NOT_ME_LINK_SECRET || 'secret-key',
      });

      return { email: payload.email };
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  async generatePasswordResetToken(userId: string): Promise<string> {
    const payload = { userId, purpose: 'password-reset' };
    const token = await this.jwtService.signAsync(payload, {
      expiresIn: process.env.PASSWORD_RESET_TOKEN_EXPIRATION || '15m',
      secret: process.env.PASSWORD_RESET_TOKEN_SECRET,
    });

    return token;
  }

  async validatePasswordResetToken(
    token: string,
  ): Promise<{ userId: string } | null> {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.PASSWORD_RESET_TOKEN_SECRET,
      });

      if (payload.purpose !== 'password-reset') {
        return null;
      }

      return { userId: payload.userId };
    } catch (error) {
      console.log('Password reset token validation error:', error);
      return null;
    }
  }
}
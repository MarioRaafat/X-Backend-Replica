import { BadRequestException, Injectable } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';
import { generateRandomOtp } from './utils/otp.util';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class VerificationService {
  constructor(
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
  ) {}

  async generateOtp(
    email: string,
    type: 'email' | 'password',
    size = 6,
  ): Promise<string> {
    const recentToken = await this.redisService.hget(`otp:${type}:${email}`);

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

    await this.redisService.hset(`otp:${type}:${email}`, {
      token: hashedToken,
      createdAt: now.toISOString(),
    });

    return otp;
  }

  async validateOtp(
    email: string,
    token: string,
    type: string,
  ): Promise<boolean> {
    const validToken = await this.redisService.hget(`otp:${type}:${email}`);

    if (validToken && (await bcrypt.compare(token, validToken.token))) {
      await this.redisService.del(`otp:${type}:${email}`);
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
}

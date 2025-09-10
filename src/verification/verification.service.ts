import { BadRequestException, Injectable } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';
import { generateRandomOtp } from './utils/otp.util';
import * as bcrypt from 'bcrypt';

@Injectable()
export class VerificationService {
  constructor(private readonly redisService: RedisService) {}

  async generateOtp(
    userId: number,
    type: 'email' | 'password',
    size = 6,
  ): Promise<string> {
    const recentToken = await this.redisService.hget(`otp:${type}:${userId}`);

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

    await this.redisService.hset(`otp:${type}:${userId}`, {
      token: hashedToken,
      createdAt: now.toISOString(),
    });

    return otp;
  }
}

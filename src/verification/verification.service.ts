import { BadRequestException, Injectable } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';
import { generateRandomOtp } from './utils/otp.util';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { OTP_KEY, OTP_OBJECT } from 'src/constants/redis';

@Injectable()
export class VerificationService {
    constructor(
        private readonly redis_service: RedisService,
        private readonly jwt_service: JwtService,
    ) {}

    async generateOtp(
        identifier: string, // email or userId
        type: 'email' | 'password',
        size = 6,
    ): Promise<string> {
        const otp_key = OTP_KEY(type, identifier);
        const recent_token = await this.redis_service.hget(otp_key);

        const now = new Date();

        if (recent_token) {
            const created_at = new Date(recent_token.createdAt);
            const one_minute_in_ms = 60 * 1000;
            const is_one_minute_passed =
                now.getTime() - created_at.getTime() >= one_minute_in_ms;

            if (!is_one_minute_passed) {
                throw new BadRequestException(
                    'Please wait a minute before requesting a new code',
                );
            }
        }

        const otp = generateRandomOtp(size);
        const hashed_token = await bcrypt.hash(otp, 10);

        const otpObject = OTP_OBJECT(type, identifier, hashed_token, now.toISOString());
        await this.redis_service.hset(otpObject.key, otpObject.value); // default 1 hour expiration

        return otp;
    }

    async validateOtp(
        identifier: string, // email or userId
        token: string,
        type: string,
    ): Promise<boolean> {
        const otp_key = OTP_KEY(type as 'email' | 'password', identifier);
        const valid_token = await this.redis_service.hget(otp_key);

        if (valid_token && (await bcrypt.compare(token, valid_token.token))) {
            await this.redis_service.del(otp_key);
            return true;
        } else {
            return false;
        }
    }

    async generateNotMeLink(email: string, base_url: string): Promise<string> {
        const payload = { email };
        const token = await this.jwt_service.signAsync(payload, {
            expiresIn: process.env.NOT_ME_LINK_EXPIRATION_TIME || '15m',
            secret: process.env.NOT_ME_LINK_SECRET || 'secret-key',
        });

        return `${base_url}?token=${encodeURIComponent(token)}`;
    }

    async validateNotMeLink(token: string): Promise<{ email: string } | null> {
        try {
            const payload = await this.jwt_service.verifyAsync(token, {
                secret: process.env.NOT_ME_LINK_SECRET || 'secret-key',
            });

            return { email: payload.email };
        } catch (error) {
            console.log(error);
            return null;
        }
    }

    async generatePasswordResetToken(user_id: string): Promise<string> {
        const payload = { userId: user_id, purpose: 'password-reset' };
        const token = await this.jwt_service.signAsync(payload, {
            expiresIn: process.env.PASSWORD_RESET_TOKEN_EXPIRATION || '15m',
            secret: process.env.PASSWORD_RESET_TOKEN_SECRET,
        });

        return token;
    }

    async validatePasswordResetToken(
        token: string,
    ): Promise<{ userId: string } | null> {
        try {
            const payload = await this.jwt_service.verifyAsync(token, {
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
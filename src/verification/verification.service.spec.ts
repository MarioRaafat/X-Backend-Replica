import { Test, TestingModule } from '@nestjs/testing';
import { VerificationService } from './verification.service';
import { RedisService } from '../redis/redis.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');
const mocked_bcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// Mock the OTP utility
jest.mock('./utils/otp.util', () => ({
    generateRandomOtp: jest.fn((size) => '1'.repeat(size)),
}));

describe('VerificationService', () => {
    let service: VerificationService;
    let redis_service: jest.Mocked<RedisService>;
    let jwt_service: jest.Mocked<JwtService>;
    let config_service: jest.Mocked<ConfigService>;

    beforeEach(async () => {
        const mock_redis_service = {
            hget: jest.fn(),
            hset: jest.fn(),
            del: jest.fn(),
        };

        const mock_jwt_service = {
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
        };

        const mock_config_service = {
            get: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                VerificationService,
                { provide: RedisService, useValue: mock_redis_service },
                { provide: JwtService, useValue: mock_jwt_service },
                { provide: ConfigService, useValue: mock_config_service },
            ],
        }).compile();

        service = module.get<VerificationService>(VerificationService);
        redis_service = module.get(RedisService);
        jwt_service = module.get(JwtService);
        config_service = module.get(ConfigService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('generateOtp', () => {
        it('should generate OTP successfully when no recent OTP exists', async () => {
            redis_service.hget.mockResolvedValue(null);
            redis_service.hset.mockResolvedValue(undefined);
            mocked_bcrypt.hash.mockResolvedValue('hashed-otp' as never);

            const otp = await service.generateOtp('test@example.com', 'email', 6);

            expect(otp).toBe('111111');
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(redis_service.hget).toHaveBeenCalled();
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(redis_service.hset).toHaveBeenCalled();

            expect(mocked_bcrypt.hash).toHaveBeenCalledWith('111111', 10);
        });

        it('should generate OTP successfully when one minute has passed', async () => {
            const one_minute_ago = new Date(Date.now() - 61 * 1000).toISOString();
            redis_service.hget.mockResolvedValue({
                token: 'old-hashed-otp',
                created_at: one_minute_ago,
            });
            redis_service.hset.mockResolvedValue(undefined);
            mocked_bcrypt.hash.mockResolvedValue('hashed-otp' as never);

            const otp = await service.generateOtp('test@example.com', 'email');

            expect(otp).toBe('111111');
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(redis_service.hset).toHaveBeenCalled();
        });

        it('should throw BadRequestException when OTP requested too soon', async () => {
            const now = new Date();
            const thirty_seconds_ago = new Date(now.getTime() - 30 * 1000).toISOString();
            redis_service.hget.mockResolvedValue({
                token: 'recent-hashed-otp',
                created_at: thirty_seconds_ago,
            });

            await expect(service.generateOtp('test@example.com', 'email')).rejects.toThrow(
                BadRequestException
            );

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(redis_service.hset).not.toHaveBeenCalled();
        });

        it('should generate OTP with custom size', async () => {
            redis_service.hget.mockResolvedValue(null);
            redis_service.hset.mockResolvedValue(undefined);
            mocked_bcrypt.hash.mockResolvedValue('hashed-otp' as never);

            const otp = await service.generateOtp('test@example.com', 'password', 8);

            expect(otp).toBe('11111111');
            expect(otp.length).toBe(8);
        });
    });

    describe('validateOtp', () => {
        it('should return true when bypass is enabled', async () => {
            config_service.get.mockReturnValue('true');

            const result = await service.validateOtp('test@example.com', '123456', 'email');

            expect(result).toBe(true);
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(config_service.get).toHaveBeenCalledWith('BYPASS_CAPTCHA_FOR_TESTING');
        });

        it('should validate OTP successfully with correct token', async () => {
            config_service.get.mockReturnValue('false');
            redis_service.hget.mockResolvedValue({
                token: 'hashed-otp',
                created_at: new Date().toISOString(),
            });
            redis_service.del.mockResolvedValue(1);
            mocked_bcrypt.compare.mockResolvedValue(true as never);

            const result = await service.validateOtp('test@example.com', '123456', 'email');

            expect(result).toBe(true);

            expect(mocked_bcrypt.compare).toHaveBeenCalledWith('123456', 'hashed-otp');
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(redis_service.del).toHaveBeenCalled();
        });

        it('should return false with incorrect token', async () => {
            config_service.get.mockReturnValue('false');
            redis_service.hget.mockResolvedValue({
                token: 'hashed-otp',
                created_at: new Date().toISOString(),
            });
            mocked_bcrypt.compare.mockResolvedValue(false as never);

            const result = await service.validateOtp('test@example.com', 'wrong-otp', 'email');

            expect(result).toBe(false);
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(redis_service.del).not.toHaveBeenCalled();
        });

        it('should return false when no token exists', async () => {
            config_service.get.mockReturnValue('false');
            redis_service.hget.mockResolvedValue(null);

            const result = await service.validateOtp('test@example.com', '123456', 'email');

            expect(result).toBe(false);
        });
    });

    describe('generateNotMeLink', () => {
        it('should generate not-me link successfully', async () => {
            process.env.NOT_ME_LINK_EXPIRATION_TIME = '15m';
            process.env.NOT_ME_LINK_SECRET = 'test-secret';
            jwt_service.signAsync.mockResolvedValue('mock-jwt-token');

            const link = await service.generateNotMeLink(
                'test@example.com',
                'https://example.com/not-me'
            );

            expect(link).toContain('https://example.com/not-me?token=');
            expect(link).toContain('mock-jwt-token');
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(jwt_service.signAsync).toHaveBeenCalledWith(
                { email: 'test@example.com' },
                expect.objectContaining({
                    expiresIn: '15m',
                    secret: 'test-secret',
                })
            );
        });

        it('should use default values when env variables are not set', async () => {
            delete process.env.NOT_ME_LINK_EXPIRATION_TIME;
            delete process.env.NOT_ME_LINK_SECRET;
            jwt_service.signAsync.mockResolvedValue('mock-jwt-token');

            const link = await service.generateNotMeLink(
                'test@example.com',
                'https://example.com/not-me'
            );

            expect(link).toBeDefined();
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(jwt_service.signAsync).toHaveBeenCalledWith(
                { email: 'test@example.com' },
                expect.objectContaining({
                    expiresIn: '15m',
                    secret: 'secret-key',
                })
            );
        });
    });

    describe('validateNotMeLink', () => {
        it('should validate not-me link successfully', async () => {
            process.env.NOT_ME_LINK_SECRET = 'test-secret';
            jwt_service.verifyAsync.mockResolvedValue({ email: 'test@example.com' });

            const result = await service.validateNotMeLink('valid-token');

            expect(result).toEqual({ email: 'test@example.com' });
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(jwt_service.verifyAsync).toHaveBeenCalledWith('valid-token', {
                secret: 'test-secret',
            });
        });

        it('should return null for invalid token', async () => {
            process.env.NOT_ME_LINK_SECRET = 'test-secret';
            jwt_service.verifyAsync.mockRejectedValue(new Error('Invalid token'));
            const console_spy = jest.spyOn(console, 'log').mockImplementation();

            const result = await service.validateNotMeLink('invalid-token');

            expect(result).toBeNull();

            expect(console_spy).toHaveBeenCalled();
            console_spy.mockRestore();
        });

        it('should use default secret when env variable is not set', async () => {
            delete process.env.NOT_ME_LINK_SECRET;
            jwt_service.verifyAsync.mockResolvedValue({ email: 'test@example.com' });

            await service.validateNotMeLink('valid-token');

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(jwt_service.verifyAsync).toHaveBeenCalledWith('valid-token', {
                secret: 'secret-key',
            });
        });
    });

    describe('generatePasswordResetToken', () => {
        it('should generate password reset token successfully', async () => {
            process.env.PASSWORD_RESET_TOKEN_EXPIRATION = '15m';
            process.env.PASSWORD_RESET_TOKEN_SECRET = 'reset-secret';
            jwt_service.signAsync.mockResolvedValue('reset-token');

            const token = await service.generatePasswordResetToken('user123');

            expect(token).toBe('reset-token');
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(jwt_service.signAsync).toHaveBeenCalledWith(
                { user_id: 'user123', purpose: 'password-reset' },
                expect.objectContaining({
                    expiresIn: '15m',
                    secret: 'reset-secret',
                })
            );
        });

        it('should use default values when env variables are not set', async () => {
            delete process.env.PASSWORD_RESET_TOKEN_EXPIRATION;
            delete process.env.PASSWORD_RESET_TOKEN_SECRET;
            jwt_service.signAsync.mockResolvedValue('reset-token');

            const token = await service.generatePasswordResetToken('user123');

            expect(token).toBe('reset-token');
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(jwt_service.signAsync).toHaveBeenCalledWith(
                { user_id: 'user123', purpose: 'password-reset' },
                expect.objectContaining({
                    expiresIn: '15m',
                    secret: 'password-reset-secret',
                })
            );
        });
    });

    describe('validatePasswordResetToken', () => {
        it('should validate password reset token successfully', async () => {
            process.env.PASSWORD_RESET_TOKEN_SECRET = 'reset-secret';
            jwt_service.verifyAsync.mockResolvedValue({
                user_id: 'user123',
                purpose: 'password-reset',
            });

            const result = await service.validatePasswordResetToken('valid-token');

            expect(result).toEqual({ user_id: 'user123' });
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(jwt_service.verifyAsync).toHaveBeenCalledWith('valid-token', {
                secret: 'reset-secret',
            });
        });

        it('should return null when purpose is incorrect', async () => {
            process.env.PASSWORD_RESET_TOKEN_SECRET = 'reset-secret';
            jwt_service.verifyAsync.mockResolvedValue({
                user_id: 'user123',
                purpose: 'wrong-purpose',
            });

            const result = await service.validatePasswordResetToken('valid-token');

            expect(result).toBeNull();
        });

        it('should return null for invalid token', async () => {
            process.env.PASSWORD_RESET_TOKEN_SECRET = 'reset-secret';
            jwt_service.verifyAsync.mockRejectedValue(new Error('Invalid token'));
            const console_spy = jest.spyOn(console, 'log').mockImplementation();

            const result = await service.validatePasswordResetToken('invalid-token');

            expect(result).toBeNull();

            expect(console_spy).toHaveBeenCalledWith(
                'Password reset token validation error:',
                expect.any(Error)
            );
            console_spy.mockRestore();
        });
    });
});

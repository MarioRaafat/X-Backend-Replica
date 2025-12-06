jest.mock('crypto', () => ({
    ...jest.requireActual('crypto'),
    randomUUID: jest.fn(() => 'mock-jti'),
}));

jest.mock('bcrypt', () => ({
    ...jest.requireActual('bcrypt'),
    hash: jest.fn(),
    compare: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserRepository } from '../user/user.repository';
import { UsernameService } from './username.service';
import * as bcrypt from 'bcrypt';
import { RedisService } from 'src/redis/redis.service';
import { JwtService } from '@nestjs/jwt';
import { VerificationService } from 'src/verification/verification.service';
import { EmailJobsService } from 'src/background-jobs/email/email.service';
import { CaptchaService } from './captcha.service';
import { ConfigService } from '@nestjs/config';
import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    InternalServerErrorException,
    NotFoundException,
    UnauthorizedException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { ERROR_MESSAGES } from 'src/constants/swagger-messages';

describe('AuthService', () => {
    let service: AuthService;

    const mock_user_service = {
        findByEmail: jest.fn(),
        findById: jest.fn(),
        findByGoogleId: jest.fn(),
        findByFacebookId: jest.fn(),
        findByGithubId: jest.fn(),
        findByUsername: jest.fn(),
        findByPhoneNumber: jest.fn(),
        createUser: jest.fn(),
        updateUserPassword: jest.fn(),
        updateUser: jest.fn(),
        updateUserById: jest.fn(),
        updatePassword: jest.fn(),
    };

    const mock_jwt_service = {
        sign: jest.fn(),
        verifyAsync: jest.fn(),
        verify: jest.fn(),
    };
    const mock_redis_service = {
        set: jest.fn(),
        sadd: jest.fn(),
        expire: jest.fn(),
        srem: jest.fn(),
        del: jest.fn(),
        smembers: jest.fn(),
        pipeline: jest.fn(),
        hget: jest.fn(),
        hset: jest.fn(),
        get: jest.fn(),
    };
    const mock_username_service = {
        generateUsername: jest.fn(),
        generateUsernameRecommendationsSingleName: jest.fn(),
        isUsernameAvailable: jest.fn(),
    };
    const mock_verification_service = {
        generateOtp: jest.fn(),
        generateNotMeLink: jest.fn(),
        validateOtp: jest.fn(),
        generatePasswordResetToken: jest.fn(),
        validatePasswordResetToken: jest.fn(),
        validateNotMeLink: jest.fn(),
    };
    const mock_email_jobs_service = {
        queueOtpEmail: jest.fn().mockResolvedValue({ success: true }),
        getEmailQueueStats: jest.fn(),
        pauseEmailQueue: jest.fn(),
        resumeEmailQueue: jest.fn(),
        cleanEmailQueue: jest.fn(),
    };
    const mock_captcha_service = {
        createCaptcha: jest.fn(),
        validateCaptcha: jest.fn(),
    };
    const mock_config_service = {
        get: jest.fn(),
    };
    const mock_background_jobs_service = {
        queueOtpEmail: jest.fn().mockResolvedValue({ success: true }),
    };

    // ---------------- SETUP ----------------
    beforeAll(() => {
        // Define env vars for test
        process.env.JWT_TOKEN_SECRET = 'test-access-secret';
        process.env.JWT_TOKEN_EXPIRATION_TIME = '1h';
        process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
        process.env.JWT_REFRESH_EXPIRATION_TIME = '7d';
    });

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: UserRepository, useValue: mock_user_service },
                { provide: JwtService, useValue: mock_jwt_service },
                { provide: UsernameService, useValue: mock_username_service },
                { provide: RedisService, useValue: mock_redis_service },
                { provide: VerificationService, useValue: mock_verification_service },
                { provide: EmailJobsService, useValue: mock_email_jobs_service },
                { provide: CaptchaService, useValue: mock_captcha_service },
                { provide: ConfigService, useValue: mock_config_service },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
    });

    // Clear mocks between tests
    afterEach(() => {
        jest.clearAllMocks();
    });

    // ---------------- TESTS ----------------
    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // -------- validateUser() tests --------
    describe('validateUser', () => {
        it('should be defined', () => {
            expect(service.validateUser).toBeDefined();
        });

        it('should return id when email and password are correct', async () => {
            mock_user_service.findByEmail.mockResolvedValueOnce({
                id: '1',
                email: 'test@example.com',
                password: 'hashedPassword',
                name: 'Test User',
                phone_number: '1234567890',
            });
            (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
            const id = await service.validateUser('test@example.com', 'password', 'email');
            expect(id).toBe('1');
        });

        it('should throw "Wrong password" when password is incorrect', async () => {
            mock_user_service.findByEmail.mockResolvedValueOnce({
                id: '1',
                email: 'test@example.com',
                password: 'hashedPassword',
                name: 'Test User',
                phone_number: '1234567890',
            });
            (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
            await expect(
                service.validateUser('test@example.com', 'wrongpassword', 'email')
            ).rejects.toThrow(ERROR_MESSAGES.WRONG_PASSWORD);
        });

        it('should throw "User not found" when user does not exist', async () => {
            mock_user_service.findByEmail.mockResolvedValueOnce(null);
            await expect(
                service.validateUser('missing@example.com', 'password', 'email')
            ).rejects.toThrow(ERROR_MESSAGES.USER_NOT_FOUND);
        });
    });

    // -------- generateTokens() tests --------
    describe('generateTokens', () => {
        it('should be defined', () => {
            expect(service.generateTokens).toBeDefined();
        });

        it('should generate access and refresh tokens and store them in Redis', async () => {
            const mock_access_token = 'mock-access-token';
            const mock_refresh_token = 'mock-refresh-token';
            const mock_jti = 'mock-jti';

            mock_jwt_service.sign
                .mockReturnValueOnce(mock_access_token) // first call → access token
                .mockReturnValueOnce(mock_refresh_token); // second call → refresh token

            const result = await service.generateTokens('user-1');

            expect(result).toEqual({
                access_token: mock_access_token,
                refresh_token: mock_refresh_token,
            });

            // Verify JWT sign calls
            expect(mock_jwt_service.sign).toHaveBeenCalledTimes(2);
            expect(mock_jwt_service.sign).toHaveBeenNthCalledWith(
                1,
                { id: 'user-1' },
                expect.objectContaining({
                    secret: process.env.JWT_TOKEN_SECRET,
                    expiresIn: process.env.JWT_TOKEN_EXPIRATION_TIME,
                })
            );
            expect(mock_jwt_service.sign).toHaveBeenNthCalledWith(
                2,
                { id: 'user-1', jti: mock_jti },
                expect.objectContaining({
                    secret: process.env.JWT_REFRESH_SECRET,
                    expiresIn: process.env.JWT_REFRESH_EXPIRATION_TIME,
                })
            );

            // Verify Redis interactions
            expect(mock_redis_service.set).toHaveBeenCalledWith(
                `refresh:${mock_jti}`,
                JSON.stringify({ id: 'user-1' }),
                7 * 24 * 60 * 60
            );
            expect(mock_redis_service.sadd).toHaveBeenCalledWith(
                `user:user-1:refreshTokens`,
                mock_jti
            );
            expect(mock_redis_service.expire).toHaveBeenCalledWith(
                `user:user-1:refreshTokens`,
                7 * 24 * 60 * 60
            );
        });

        it('should throw if jwtService.sign throws an error', async () => {
            //used mockImplementationOnce for sync error throwing
            mock_jwt_service.sign.mockImplementationOnce(() => {
                throw new Error('JWT error');
            });

            await expect(service.generateTokens('user-1')).rejects.toThrow('JWT error');
        });

        it('should throw if redisService.set rejects', async () => {
            mock_jwt_service.sign
                .mockReturnValueOnce('mock-access-token')
                .mockReturnValueOnce('mock-refresh-token');
            //used mockRejectedValueOnce for async error throwing
            mock_redis_service.set.mockRejectedValueOnce(new Error('Redis down'));

            await expect(service.generateTokens('user-1')).rejects.toThrow('Redis down');
        });
    });

    describe('login', () => {
        it('should be defined', () => {
            expect(service.login).toBeDefined();
        });

        it('should return user and tokens on successful login', async () => {
            const mock_tokens = { access_token: 'access', refresh_token: 'refresh' };

            const mock_user = {
                id: 'user-1',
                email: 'test@example.com',
                name: 'Test User',
                phone_number: '1234567890',
            };
            // Set up findById to return mock_user when called with 'user-1'
            mock_user_service.findById.mockResolvedValueOnce(mock_user);
            //mock the methods used inside login()
            jest.spyOn(service, 'generateTokens').mockResolvedValue(mock_tokens);
            jest.spyOn(service, 'validateUser').mockResolvedValue('user-1');

            const result = await service.login({
                identifier: 'test@example.com',
                type: 'email',
                password: 'password',
            });

            expect(service.validateUser).toHaveBeenCalledWith(
                'test@example.com',
                'password',
                'email'
            );

            expect(service.generateTokens).toHaveBeenCalledWith('user-1');

            expect(result).toEqual({
                user: mock_user,
                ...mock_tokens,
            });
        });
        it('should throw if validateUser throws', async () => {
            jest.spyOn(service, 'validateUser').mockRejectedValue(new Error('some random failure'));

            await expect(
                service.login({
                    identifier: 'test@example.com',
                    type: 'email',
                    password: 'password',
                })
            ).rejects.toThrow();
        });

        it('should throw if findById returns null', async () => {
            jest.spyOn(service, 'validateUser').mockResolvedValue('user-1');
            mock_user_service.findById.mockResolvedValueOnce(null);

            await expect(
                service.login({
                    identifier: 'test@example.com',
                    type: 'email',
                    password: 'password',
                })
            ).rejects.toThrow(ERROR_MESSAGES.USER_NOT_FOUND);
        });

        it('should throw if generateTokens throws', async () => {
            jest.spyOn(service, 'validateUser').mockResolvedValue('user-1');
            mock_user_service.findById.mockResolvedValueOnce({
                id: 'user-1',
                email: 'test@example.com',
                name: 'Test User',
                phone_number: '1234567890',
            });
            jest.spyOn(service, 'generateTokens').mockRejectedValue(new Error('token error'));

            await expect(
                service.login({
                    identifier: 'test@example.com',
                    type: 'email',
                    password: 'password',
                })
            ).rejects.toThrow();
        });
    });

    describe('logout', () => {
        let mock_res: any;

        beforeEach(() => {
            mock_res = { clearCookie: jest.fn() };
        });

        it('should logout successfully and clear cookies', async () => {
            const mock_payload = { id: 'user-1', jti: 'jti-123' };

            mock_jwt_service.verifyAsync.mockResolvedValueOnce(mock_payload);
            mock_redis_service.del.mockResolvedValueOnce(1);
            mock_redis_service.srem.mockResolvedValueOnce(1);

            const result = await service.logout('valid-refresh-token', mock_res);

            // verify jwt call
            expect(mock_jwt_service.verifyAsync).toHaveBeenCalledWith('valid-refresh-token', {
                secret: process.env.JWT_REFRESH_SECRET,
            });

            // verify redis cleanup
            expect(mock_redis_service.del).toHaveBeenCalledWith(`refresh:${mock_payload.jti}`);
            expect(mock_redis_service.srem).toHaveBeenCalledWith(
                `user:${mock_payload.id}:refreshTokens`,
                mock_payload.jti
            );

            // verify cookie cleared
            expect(mock_res.clearCookie).toHaveBeenCalledWith('refresh_token', {
                httpOnly: true,
                secure: true,
                sameSite: 'strict',
            });

            expect(result).toEqual({});
        });

        it('should throw UnauthorizedException if token is invalid', async () => {
            mock_jwt_service.verifyAsync.mockRejectedValueOnce(new Error('Invalid token'));

            await expect(service.logout('invalid-token', mock_res)).rejects.toThrow(
                new UnauthorizedException(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
            );

            expect(mock_redis_service.del).not.toHaveBeenCalled();
            expect(mock_redis_service.srem).not.toHaveBeenCalled();
            expect(mock_res.clearCookie).not.toHaveBeenCalled();
        });

        it('should throw UnauthorizedException if redis throws an error', async () => {
            const mock_payload = { id: 'user-1', jti: 'jti-123' };
            mock_jwt_service.verifyAsync.mockResolvedValueOnce(mock_payload);
            mock_redis_service.del.mockRejectedValueOnce(new Error('Redis down'));

            await expect(service.logout('valid-refresh-token', mock_res)).rejects.toThrow();

            // jwt verified but redis failed
            expect(mock_jwt_service.verifyAsync).toHaveBeenCalled();
            expect(mock_res.clearCookie).not.toHaveBeenCalled();
        });
    });

    describe('logoutAll', () => {
        let mock_res: any;

        beforeEach(() => {
            mock_res = { clearCookie: jest.fn() };
        });

        it('should log out from all devices successfully and clear cookies', async () => {
            const mock_payload = { id: 'user-1', jti: 'jti-123' };
            const mock_tokens = ['token1', 'token2'];

            // Mock JWT + Redis
            mock_jwt_service.verifyAsync.mockResolvedValueOnce(mock_payload);
            mock_redis_service.smembers = jest.fn().mockResolvedValueOnce(mock_tokens);

            // Create a mock pipeline
            const exec_mock = jest.fn().mockResolvedValueOnce([]);
            const del_mock = jest.fn().mockReturnThis();
            const mock_pipeline = {
                del: del_mock,
                exec: exec_mock,
            };

            mock_redis_service.pipeline = jest.fn(() => mock_pipeline);

            const result = await service.logoutAll('valid-refresh-token', mock_res);

            // Verify verifyAsync was called
            expect(mock_jwt_service.verifyAsync).toHaveBeenCalledWith('valid-refresh-token', {
                secret: process.env.JWT_REFRESH_SECRET,
            });

            // Verify Redis operations
            expect(mock_redis_service.smembers).toHaveBeenCalledWith('user:user-1:refreshTokens');
            expect(mock_redis_service.pipeline).toHaveBeenCalled();
            expect(del_mock).toHaveBeenCalledTimes(3); // token1, token2, and the user set
            expect(exec_mock).toHaveBeenCalled();

            // Verify cookie clearing
            expect(mock_res.clearCookie).toHaveBeenCalledWith('refresh_token', {
                httpOnly: true,
                secure: true,
                sameSite: 'strict',
            });

            expect(result).toEqual({});
        });

        it('should do nothing with Redis if user has no refresh tokens', async () => {
            const mock_payload = { id: 'user-1', jti: 'jti-123' };

            mock_jwt_service.verifyAsync.mockResolvedValueOnce(mock_payload);
            mock_redis_service.smembers = jest.fn().mockResolvedValueOnce([]);
            mock_redis_service.pipeline = jest.fn();

            const result = await service.logoutAll('valid-refresh-token', mock_res);

            expect(mock_redis_service.pipeline).not.toHaveBeenCalled();
            expect(mock_res.clearCookie).toHaveBeenCalled();
            expect(result).toEqual({});
        });

        it('should throw UnauthorizedException if token is invalid', async () => {
            mock_jwt_service.verifyAsync.mockRejectedValueOnce(new Error('Invalid token'));

            await expect(service.logoutAll('invalid-token', mock_res)).rejects.toThrow(
                new UnauthorizedException(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
            );

            expect(mock_redis_service.smembers).not.toHaveBeenCalled();
            expect(mock_redis_service.pipeline).not.toHaveBeenCalled();
            expect(mock_res.clearCookie).not.toHaveBeenCalled();
        });
    });

    describe('generateEmailVerification', () => {
        const mock_user = { name: 'John' };

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should send verification email successfully', async () => {
            // Mock user in Redis
            mock_redis_service.hget = jest.fn().mockResolvedValueOnce(mock_user);
            mock_verification_service.generateOtp = jest.fn().mockResolvedValueOnce('123456');
            mock_verification_service.generateNotMeLink = jest
                .fn()
                .mockResolvedValueOnce('https://notme.link');
            mock_email_jobs_service.queueOtpEmail = jest
                .fn()
                .mockResolvedValueOnce({ success: true });

            const result = await service.generateEmailVerification('test@example.com');

            expect(mock_redis_service.hget).toHaveBeenCalledWith('signup:session:test@example.com');
            expect(mock_verification_service.generateOtp).toHaveBeenCalledWith(
                'test@example.com',
                'email'
            );
            expect(mock_verification_service.generateNotMeLink).toHaveBeenCalled();
            expect(mock_email_jobs_service.queueOtpEmail).toHaveBeenCalledWith(
                expect.objectContaining({
                    email: 'test@example.com',
                    username: 'John',
                    otp: '123456',
                    email_type: 'verification',
                    not_me_link: 'https://notme.link',
                })
            );

            expect(result).toEqual({ isEmailSent: true });
        });

        it('should throw NotFoundException if user not in Redis', async () => {
            mock_redis_service.hget = jest.fn().mockResolvedValueOnce(null);

            await expect(service.generateEmailVerification('missing@example.com')).rejects.toThrow(
                new NotFoundException('User not found or already verified')
            );

            expect(mock_verification_service.generateOtp).not.toHaveBeenCalled();
            expect(mock_email_jobs_service.queueOtpEmail).not.toHaveBeenCalled();
        });

        it('should throw InternalServerErrorException if emailService.sendEmail fails', async () => {
            mock_redis_service.hget = jest.fn().mockResolvedValueOnce(mock_user);
            mock_verification_service.generateOtp = jest.fn().mockResolvedValueOnce('123456');
            mock_verification_service.generateNotMeLink = jest
                .fn()
                .mockResolvedValueOnce('https://notme.link');
            mock_email_jobs_service.queueOtpEmail = jest
                .fn()
                .mockResolvedValueOnce({ success: false });

            await expect(service.generateEmailVerification('test@example.com')).rejects.toThrow(
                new InternalServerErrorException(ERROR_MESSAGES.FAILED_TO_SEND_OTP_EMAIL)
            );
        });
    });

    describe('sendResetPasswordEmail', () => {
        const mock_user = {
            id: 'user-1',
            email: 'test@example.com',
            name: 'John',
            password: 'hashedPassword',
            phone_number: '1234567890',
        };

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should send password reset email successfully', async () => {
            mock_user_service.findByEmail.mockResolvedValueOnce(mock_user);
            mock_user_service.findById.mockResolvedValueOnce(mock_user);
            mock_verification_service.generateOtp.mockResolvedValueOnce('123456');
            mock_email_jobs_service.queueOtpEmail.mockResolvedValueOnce({ success: true });

            const result = await service.sendResetPasswordEmail('test@example.com');

            expect(mock_user_service.findById).toHaveBeenCalledWith('user-1');
            expect(mock_verification_service.generateOtp).toHaveBeenCalledWith(
                'user-1',
                'password'
            );
            expect(mock_email_jobs_service.queueOtpEmail).toHaveBeenCalledWith(
                expect.objectContaining({
                    email: 'test@example.com',
                    username: undefined, // user object doesn't have username property
                    otp: '123456',
                    email_type: 'reset_password',
                })
            );

            expect(result).toEqual({ isEmailSent: true });
        });

        it('should throw NotFoundException if user not found', async () => {
            mock_user_service.findByEmail = jest.fn().mockResolvedValue(null);

            await expect(service.sendResetPasswordEmail('missing@example.com')).rejects.toThrow(
                new NotFoundException(ERROR_MESSAGES.EMAIL_NOT_FOUND)
            );

            expect(mock_verification_service.generateOtp).not.toHaveBeenCalled();
            expect(mock_email_jobs_service.queueOtpEmail).not.toHaveBeenCalled();
        });

        it('should throw InternalServerErrorException if email sending fails', async () => {
            mock_user_service.findByEmail.mockResolvedValueOnce(mock_user);
            mock_user_service.findById.mockResolvedValueOnce(mock_user);
            mock_verification_service.generateOtp.mockResolvedValueOnce('123456');
            mock_email_jobs_service.queueOtpEmail.mockResolvedValueOnce({ success: false });

            await expect(service.sendResetPasswordEmail('test@example.com')).rejects.toThrow(
                new InternalServerErrorException(ERROR_MESSAGES.FAILED_TO_SEND_OTP_EMAIL)
            );
        });

        it('should propagate error if OTP generation fails', async () => {
            mock_user_service.findByEmail.mockResolvedValueOnce(mock_user);
            mock_user_service.findById.mockResolvedValueOnce(mock_user);
            mock_verification_service.generateOtp.mockRejectedValueOnce(
                new Error('OTP service down')
            );

            await expect(service.sendResetPasswordEmail('test@example.com')).rejects.toThrow(
                'OTP service down'
            );
        });
    });

    describe('verifyResetPasswordOtp', () => {
        const user_email = 'test@example.com';
        const otp_token = '654321';
        const reset_token = 'secure-reset-token';
        const mock_user = {
            id: 'user-123',
            email: 'test@example.com',
            name: 'John',
            password: 'hashedPassword',
            phone_number: '1234567890',
        };

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should verify OTP successfully and return reset_token', async () => {
            mock_user_service.findByEmail.mockResolvedValueOnce(mock_user);
            mock_verification_service.validateOtp = jest.fn().mockResolvedValueOnce(true);
            mock_verification_service.generatePasswordResetToken = jest
                .fn()
                .mockResolvedValueOnce(reset_token);

            const result = await service.verifyResetPasswordOtp(user_email, otp_token);

            expect(mock_verification_service.validateOtp).toHaveBeenCalledWith(
                'user-123',
                otp_token,
                'password'
            );
            expect(mock_verification_service.generatePasswordResetToken).toHaveBeenCalledWith(
                'user-123'
            );
            expect(result).toEqual({ isValid: true, reset_token });
        });

        it('should throw UnprocessableEntityException if OTP is invalid', async () => {
            mock_user_service.findByEmail.mockResolvedValueOnce(mock_user);
            mock_verification_service.validateOtp = jest.fn().mockResolvedValueOnce(false);

            await expect(service.verifyResetPasswordOtp(user_email, otp_token)).rejects.toThrow(
                UnprocessableEntityException
            );

            expect(mock_verification_service.generatePasswordResetToken).not.toHaveBeenCalled();
        });

        it('should throw InternalServerErrorException if validateOtp throws', async () => {
            mock_user_service.findByEmail.mockResolvedValueOnce(mock_user);
            mock_verification_service.validateOtp = jest
                .fn()
                .mockRejectedValueOnce(new Error('OTP error'));

            await expect(service.verifyResetPasswordOtp(user_email, otp_token)).rejects.toThrow(
                'OTP error'
            );

            expect(mock_verification_service.generatePasswordResetToken).not.toHaveBeenCalled();
        });

        it('should throw InternalServerErrorException if generatePasswordResetToken throws', async () => {
            mock_user_service.findByEmail.mockResolvedValueOnce(mock_user);
            mock_verification_service.validateOtp = jest.fn().mockResolvedValueOnce(true);
            mock_verification_service.generatePasswordResetToken = jest
                .fn()
                .mockRejectedValueOnce(new Error('Token gen failed'));

            await expect(service.verifyResetPasswordOtp(user_email, otp_token)).rejects.toThrow(
                'Token gen failed'
            );
        });
    });

    describe('resetPassword', () => {
        const user_email = 'test@example.com';
        const valid_token = 'valid-reset-token';
        const new_password = 'newPass123';
        const hashed_new_password = 'hashed-new-pass';
        const existing_hashed_password = 'hashed-old-pass';
        const mock_user = {
            id: 'user-123',
            email: 'test@example.com',
            name: 'John',
            password: existing_hashed_password,
            phone_number: '1234567890',
        };

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should reset password successfully', async () => {
            const mock_token_data = { user_id: 'user-123' };

            mock_user_service.findByEmail.mockResolvedValueOnce(mock_user);
            mock_user_service.findById.mockResolvedValueOnce(mock_user);
            mock_verification_service.validatePasswordResetToken.mockResolvedValueOnce(
                mock_token_data
            );
            mock_user_service.findById.mockResolvedValueOnce(mock_user);
            (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
            (bcrypt.hash as jest.Mock).mockResolvedValueOnce(hashed_new_password);
            mock_user_service.updatePassword.mockResolvedValueOnce(true);

            const result = await service.resetPassword(user_email, new_password, valid_token);

            expect(mock_verification_service.validatePasswordResetToken).toHaveBeenCalledWith(
                valid_token
            );
            expect(mock_user_service.findById).toHaveBeenCalledWith('user-123');
            expect(bcrypt.compare).toHaveBeenCalledWith(new_password, existing_hashed_password);
            expect(bcrypt.hash).toHaveBeenCalledWith(new_password, 10);
            expect(mock_user_service.updatePassword).toHaveBeenCalledWith(
                'user-123',
                hashed_new_password
            );

            expect(result).toEqual({});
        });

        it('should throw UnauthorizedException if token is invalid or expired', async () => {
            mock_user_service.findByEmail.mockResolvedValueOnce({
                id: 'user-123',
                email: user_email,
                password: 'hashed-pass',
                name: 'Test User',
                phone_number: '+1234567890',
            });
            mock_verification_service.validatePasswordResetToken.mockResolvedValueOnce(null);

            await expect(
                service.resetPassword(user_email, new_password, valid_token)
            ).rejects.toThrow(new UnauthorizedException(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN));

            expect(mock_user_service.findById).not.toHaveBeenCalled();
        });

        it('should throw UnauthorizedException if token user_id does not match request user_id', async () => {
            mock_user_service.findByEmail.mockResolvedValueOnce(mock_user);
            mock_verification_service.validatePasswordResetToken.mockResolvedValueOnce({
                user_id: 'another-user',
            });

            await expect(
                service.resetPassword(user_email, new_password, valid_token)
            ).rejects.toThrow(new UnauthorizedException(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN));

            expect(mock_user_service.findById).not.toHaveBeenCalled();
        });

        it('should throw NotFoundException if user is not found', async () => {
            mock_user_service.findByEmail.mockResolvedValueOnce(mock_user);
            mock_verification_service.validatePasswordResetToken.mockResolvedValueOnce({
                user_id: 'user-123',
            });
            mock_user_service.findById.mockReset();
            mock_user_service.findById.mockResolvedValueOnce(null);

            await expect(
                service.resetPassword(user_email, new_password, valid_token)
            ).rejects.toThrow(new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND));

            expect(bcrypt.compare).not.toHaveBeenCalled();
        });

        it('should throw BadRequestException if new password matches current one', async () => {
            mock_user_service.findByEmail.mockResolvedValueOnce(mock_user);
            mock_verification_service.validatePasswordResetToken.mockResolvedValueOnce({
                user_id: 'user-123',
            });
            mock_user_service.findById.mockReset();
            mock_user_service.findById.mockResolvedValueOnce(mock_user);
            (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true); // same password

            await expect(
                service.resetPassword(user_email, new_password, valid_token)
            ).rejects.toThrow(new BadRequestException(ERROR_MESSAGES.NEW_PASSWORD_SAME_AS_OLD));

            expect(mock_user_service.updatePassword).not.toHaveBeenCalled();
        });

        it('should throw if updatePassword fails', async () => {
            mock_user_service.findByEmail.mockResolvedValueOnce(mock_user);
            mock_verification_service.validatePasswordResetToken.mockResolvedValueOnce({
                user_id: 'user-123',
            });
            mock_user_service.findById.mockReset();
            mock_user_service.findById.mockResolvedValueOnce(mock_user);
            (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
            (bcrypt.hash as jest.Mock).mockResolvedValueOnce(hashed_new_password);
            mock_user_service.updatePassword.mockRejectedValueOnce(new Error('DB error'));

            await expect(
                service.resetPassword(user_email, new_password, valid_token)
            ).rejects.toThrow('DB error');
        });
    });

    describe('handleNotMe', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should delete pending user and otp if valid token', async () => {
            const mock_user = { email: 'test@example.com' };

            mock_verification_service.validateNotMeLink.mockResolvedValue(mock_user);
            mock_redis_service.hget.mockResolvedValue({ email: mock_user.email });
            mock_redis_service.del.mockResolvedValue(true);

            const result = await service.handleNotMe('valid_token');

            expect(mock_verification_service.validateNotMeLink).toHaveBeenCalledWith('valid_token');
            expect(mock_redis_service.hget).toHaveBeenCalledWith(
                `signup:session:${mock_user.email}`
            );
            expect(mock_redis_service.del).toHaveBeenCalledTimes(2);
            expect(mock_redis_service.del).toHaveBeenCalledWith(
                `signup:session:${mock_user.email}`
            );
            expect(mock_redis_service.del).toHaveBeenCalledWith(`otp:email:${mock_user.email}`);
            expect(result).toEqual({});
        });

        it('should throw UnauthorizedException if token is invalid or expired', async () => {
            mock_verification_service.validateNotMeLink.mockResolvedValue(null);

            await expect(service.handleNotMe('invalid_token')).rejects.toThrow(
                UnauthorizedException
            );

            expect(mock_verification_service.validateNotMeLink).toHaveBeenCalledWith(
                'invalid_token'
            );
            expect(mock_redis_service.hget).not.toHaveBeenCalled();
            expect(mock_redis_service.del).not.toHaveBeenCalled();
        });

        it('should throw BadRequestException if account already verified', async () => {
            const mock_user = { email: 'test@example.com' };

            mock_verification_service.validateNotMeLink.mockResolvedValue(mock_user);
            mock_redis_service.hget.mockResolvedValue(null);

            await expect(service.handleNotMe('expired_link')).rejects.toThrow(BadRequestException);

            expect(mock_verification_service.validateNotMeLink).toHaveBeenCalledWith(
                'expired_link'
            );
            expect(mock_redis_service.hget).toHaveBeenCalledWith(
                `signup:session:${mock_user.email}`
            );
            expect(mock_redis_service.del).not.toHaveBeenCalled();
        });
    });

    describe('changePassword', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should update password successfully when valid', async () => {
            const mock_user = { id: 'user123', password: 'hashedOldPass' };
            mock_user_service.findById.mockReset();
            mock_user_service.findById.mockResolvedValueOnce(mock_user);
            (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
            (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashedNewPass');

            const result = await service.changePassword('user123', 'oldPass', 'newPass');

            expect(mock_user_service.findById).toHaveBeenCalledWith('user123');
            expect(bcrypt.compare).toHaveBeenCalledWith('oldPass', 'hashedOldPass');
            expect(bcrypt.hash).toHaveBeenCalledWith('newPass', 10);
            expect(mock_user_service.updatePassword).toHaveBeenCalledWith(
                'user123',
                'hashedNewPass'
            );
            expect(result).toEqual({});
        });

        it('should update password even if user has no current password (OAuth user)', async () => {
            const mock_user = { id: 'user123', password: null };
            mock_user_service.findById.mockReset();
            mock_user_service.findById.mockResolvedValueOnce(mock_user);
            (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashedNewPass');

            const result = await service.changePassword('user123', 'oldPass', 'newPass');

            expect(bcrypt.compare).not.toHaveBeenCalled();
            expect(mock_user_service.updatePassword).toHaveBeenCalledWith(
                'user123',
                'hashedNewPass'
            );
            expect(result).toEqual({});
        });

        it('should throw BadRequestException if new password equals old password', async () => {
            await expect(service.changePassword('user123', 'samePass', 'samePass')).rejects.toThrow(
                BadRequestException
            );

            expect(mock_user_service.findById).not.toHaveBeenCalled();
            expect(mock_user_service.updatePassword).not.toHaveBeenCalled();
        });

        it('should throw NotFoundException if user not found', async () => {
            mock_user_service.findById.mockReset();
            mock_user_service.findById.mockResolvedValueOnce(null);

            await expect(service.changePassword('user123', 'oldPass', 'newPass')).rejects.toThrow(
                NotFoundException
            );

            expect(mock_user_service.findById).toHaveBeenCalledWith('user123');
            expect(mock_user_service.updatePassword).not.toHaveBeenCalled();
        });

        it('should throw UnauthorizedException if old password is wrong', async () => {
            const mock_user = { id: 'user123', password: 'hashedOldPass' };
            mock_user_service.findById.mockResolvedValue(mock_user);
            jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

            await expect(
                service.changePassword('user123', 'wrongOldPass', 'newPass')
            ).rejects.toThrow(UnauthorizedException);

            expect(bcrypt.compare).toHaveBeenCalledWith('wrongOldPass', 'hashedOldPass');
            expect(mock_user_service.updatePassword).not.toHaveBeenCalled();
        });
    });

    describe('refresh', () => {
        const mock_payload = { id: 'user123', jti: 'token123' };
        const mock_tokens = { accessToken: 'access', refreshToken: 'refresh' };

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should refresh tokens successfully', async () => {
            mock_jwt_service.verifyAsync.mockResolvedValue(mock_payload);
            mock_redis_service.get.mockResolvedValue('1'); // token exists
            mock_redis_service.del.mockResolvedValue(1);
            jest.spyOn(service, 'generateTokens').mockResolvedValue(mock_tokens as any);

            const result = await service.refresh('valid-refresh-token');

            expect(mock_jwt_service.verifyAsync).toHaveBeenCalledWith('valid-refresh-token', {
                secret: process.env.JWT_REFRESH_SECRET,
            });
            expect(mock_redis_service.get).toHaveBeenCalledWith('refresh:token123');
            expect(mock_redis_service.del).toHaveBeenCalledWith('refresh:token123');
            expect(service.generateTokens).toHaveBeenCalledWith('user123');
            expect(result).toEqual(mock_tokens);
        });

        it('should throw UnauthorizedException if refresh token not in Redis', async () => {
            mock_jwt_service.verifyAsync.mockResolvedValue(mock_payload);
            mock_redis_service.get.mockResolvedValue(null);

            await expect(service.refresh('invalid-refresh')).rejects.toThrow(
                new UnauthorizedException(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
            );

            expect(mock_redis_service.del).not.toHaveBeenCalled();
        });

        it('should throw UnauthorizedException if JWT verification fails', async () => {
            mock_jwt_service.verifyAsync.mockRejectedValue(new Error('invalid jwt'));

            await expect(service.refresh('bad-token')).rejects.toThrow(
                new UnauthorizedException(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
            );

            expect(mock_redis_service.get).not.toHaveBeenCalled();
        });
    });

    describe('validateGoogleUser', () => {
        const mock_google_user = {
            google_id: 'google123',
            email: 'test@example.com',
            first_name: 'John',
            last_name: 'Doe',
            avatar_url: 'http://avatar.com/john',
        };

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should return user if found by google_id', async () => {
            const existing_user = { id: '1', email: 'test@example.com' };
            mock_user_service.findByGoogleId.mockResolvedValueOnce(existing_user);

            const result = await service.validateGoogleUser(mock_google_user);

            expect(mock_user_service.findByGoogleId).toHaveBeenCalledWith('google123');
            expect(result).toEqual({
                user: existing_user,
                needs_completion: false,
            });
            expect(mock_user_service.findByEmail).not.toHaveBeenCalled();
            expect(mock_user_service.createUser).not.toHaveBeenCalled();
        });

        it('should update existing user with googleId if found by email', async () => {
            mock_user_service.findByGoogleId.mockResolvedValueOnce(null);
            const user_by_email = { id: '2', email: 'test@example.com' };
            const updated_user = { ...user_by_email, google_id: 'google123' };

            mock_user_service.findByEmail.mockResolvedValueOnce(user_by_email as any);
            mock_user_service.updateUserById.mockResolvedValueOnce(updated_user);

            const result = await service.validateGoogleUser(mock_google_user);

            expect(mock_user_service.findByGoogleId).toHaveBeenCalledWith('google123');
            expect(mock_user_service.findByEmail).toHaveBeenCalledWith('test@example.com');
            expect(mock_user_service.updateUserById).toHaveBeenCalledWith('2', {
                google_id: 'google123',
                avatar_url: 'http://avatar.com/john',
            });
            expect(result).toEqual({
                user: updated_user,
                needs_completion: false,
            });
        });

        it('should throw if updateUser fails to return user', async () => {
            mock_user_service.findByGoogleId.mockResolvedValueOnce(null);
            const user_by_email = { id: '2', email: 'test@example.com' };
            mock_user_service.findByEmail.mockResolvedValueOnce(user_by_email as any);
            mock_user_service.updateUserById.mockResolvedValueOnce(null);

            await expect(service.validateGoogleUser(mock_google_user)).rejects.toThrow(
                new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
            );
        });

        it('should create a new user if not found by googleId or email', async () => {
            mock_user_service.findByGoogleId.mockResolvedValueOnce(null);
            mock_user_service.findByEmail.mockResolvedValueOnce(null);

            const created_user = { id: '3', ...mock_google_user };
            mock_user_service.createUser.mockResolvedValueOnce(created_user);

            const result = await service.validateGoogleUser(mock_google_user);

            expect(mock_user_service.findByGoogleId).toHaveBeenCalledWith('google123');
            expect(mock_user_service.findByEmail).toHaveBeenCalledWith('test@example.com');
            expect(result).toEqual({
                needs_completion: true,
                user: {
                    email: 'test@example.com',
                    name: 'John Doe',
                    avatar_url: 'http://avatar.com/john',
                    google_id: 'google123',
                },
            });
            expect(result).toEqual({
                needs_completion: true,
                user: {
                    email: 'test@example.com',
                    name: 'John Doe',
                    avatar_url: 'http://avatar.com/john',
                    google_id: 'google123',
                },
            });
        });
    });

    describe('validateFacebookUser', () => {
        const mock_facebook_user = {
            facebook_id: 'fb123',
            email: 'test@example.com',
            first_name: 'John',
            last_name: 'Doe',
            avatar_url: 'http://avatar.com/john',
        };

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should return user if found by facebook_id', async () => {
            const existing_user = { id: '1', email: 'test@example.com' };
            mock_user_service.findByFacebookId.mockResolvedValueOnce(existing_user);

            const result = await service.validateFacebookUser(mock_facebook_user);

            expect(mock_user_service.findByFacebookId).toHaveBeenCalledWith('fb123');
            expect(result).toEqual({
                user: existing_user,
                needs_completion: false,
            });
            expect(mock_user_service.findByEmail).not.toHaveBeenCalled();
            expect(mock_user_service.createUser).not.toHaveBeenCalled();
        });

        it('should update existing user with facebook_id if found by email', async () => {
            mock_user_service.findByFacebookId.mockResolvedValueOnce(null);
            const user_by_email = { id: '2', email: 'test@example.com' };
            const updated_user = { ...user_by_email, facebook_id: 'fb123' };

            mock_user_service.findByEmail.mockResolvedValueOnce(user_by_email);
            mock_user_service.updateUserById.mockResolvedValueOnce(updated_user);

            const result = await service.validateFacebookUser(mock_facebook_user);

            expect(mock_user_service.findByFacebookId).toHaveBeenCalledWith('fb123');
            expect(mock_user_service.findByEmail).toHaveBeenCalledWith('test@example.com');
            expect(mock_user_service.updateUserById).toHaveBeenCalledWith('2', {
                facebook_id: 'fb123',
                avatar_url: 'http://avatar.com/john',
            });
            expect(result).toEqual({
                user: updated_user,
                needs_completion: false,
            });
        });

        it('should throw if updateUser fails to return user', async () => {
            mock_user_service.findByFacebookId.mockResolvedValueOnce(null);
            const user_by_email = { id: '2', email: 'test@example.com' };
            mock_user_service.findByEmail.mockResolvedValueOnce(user_by_email);
            mock_user_service.updateUserById.mockResolvedValueOnce(null);

            await expect(service.validateFacebookUser(mock_facebook_user)).rejects.toThrow(
                new InternalServerErrorException(ERROR_MESSAGES.FAILED_TO_UPDATE_IN_DB)
            );
        });

        it('should create a new user if not found by facebook_id or email', async () => {
            mock_user_service.findByFacebookId.mockResolvedValueOnce(null);
            mock_user_service.findByEmail.mockResolvedValueOnce(null);

            const created_user = { id: '3', ...mock_facebook_user };
            mock_user_service.createUser.mockResolvedValueOnce(created_user);

            const result = await service.validateFacebookUser(mock_facebook_user);

            expect(mock_user_service.findByFacebookId).toHaveBeenCalledWith('fb123');
            expect(mock_user_service.findByEmail).toHaveBeenCalledWith('test@example.com');
            expect(result).toEqual({
                needs_completion: true,
                user: {
                    email: 'test@example.com',
                    name: 'John Doe',
                    facebook_id: 'fb123',
                    avatar_url: 'http://avatar.com/john',
                },
            });
        });
    });

    describe('validateGitHubUser', () => {
        const mock_git_hub_user = {
            github_id: 'gh123',
            email: 'dev@example.com',
            first_name: 'Dev',
            last_name: 'Coder',
            avatar_url: 'http://avatar.com/dev',
        };

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should return user if found by github_id', async () => {
            const existing_user = { id: '1', email: 'dev@example.com' };
            mock_user_service.findByGithubId.mockResolvedValueOnce(existing_user);

            const result = await service.validateGitHubUser(mock_git_hub_user);

            expect(mock_user_service.findByGithubId).toHaveBeenCalledWith('gh123');
            expect(result).toEqual({
                user: existing_user,
                needs_completion: false,
            });
            expect(mock_user_service.findByEmail).not.toHaveBeenCalled();
            expect(mock_user_service.createUser).not.toHaveBeenCalled();
        });

        it('should update existing user with github_id if found by email', async () => {
            mock_user_service.findByGithubId.mockResolvedValueOnce(null);
            const user_by_email = { id: '2', email: 'dev@example.com' };
            const updated_user = { ...user_by_email, github_id: 'gh123' };

            mock_user_service.findByEmail.mockResolvedValueOnce(user_by_email);
            mock_user_service.updateUserById.mockResolvedValueOnce(updated_user);

            const result = await service.validateGitHubUser(mock_git_hub_user);

            expect(mock_user_service.findByGithubId).toHaveBeenCalledWith('gh123');
            expect(mock_user_service.findByEmail).toHaveBeenCalledWith('dev@example.com');
            expect(mock_user_service.updateUserById).toHaveBeenCalledWith('2', {
                github_id: 'gh123',
                avatar_url: 'http://avatar.com/dev',
            });
            expect(result).toEqual({
                user: updated_user,
                needs_completion: false,
            });
        });

        it('should throw if updateUser fails to return user', async () => {
            mock_user_service.findByGithubId.mockResolvedValueOnce(null);
            const user_by_email = { id: '2', email: 'dev@example.com' };
            mock_user_service.findByEmail.mockResolvedValueOnce(user_by_email);
            mock_user_service.updateUserById.mockResolvedValueOnce(null);

            await expect(service.validateGitHubUser(mock_git_hub_user)).rejects.toThrow(
                new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
            );
        });

        it('should create a new user if not found by github_id or email', async () => {
            mock_user_service.findByGithubId.mockResolvedValueOnce(null);
            mock_user_service.findByEmail.mockResolvedValueOnce(null);

            const created_user = { id: '3', ...mock_git_hub_user };
            mock_user_service.createUser.mockResolvedValueOnce(created_user);

            const result = await service.validateGitHubUser(mock_git_hub_user);

            expect(mock_user_service.findByGithubId).toHaveBeenCalledWith('gh123');
            expect(mock_user_service.findByEmail).toHaveBeenCalledWith('dev@example.com');
            expect(result).toEqual({
                needs_completion: true,
                user: {
                    email: 'dev@example.com',
                    name: 'Dev Coder',
                    github_id: 'gh123',
                    avatar_url: 'http://avatar.com/dev',
                },
            });
        });
    });

    describe('signupStep1', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should create signup session and send verification email', async () => {
            const dto = {
                name: 'John Doe',
                birth_date: '1990-01-01',
                email: 'john@example.com',
                captcha_token: 'valid-captcha',
            };

            mock_user_service.findByEmail.mockResolvedValueOnce(null);
            mock_captcha_service.validateCaptcha.mockResolvedValueOnce(true);
            mock_redis_service.hset.mockResolvedValueOnce(true);
            mock_redis_service.hget.mockResolvedValueOnce({
                name: 'John Doe',
                email: 'john@example.com',
            });
            mock_verification_service.generateOtp.mockResolvedValueOnce('123456');
            mock_verification_service.generateNotMeLink.mockResolvedValueOnce('https://notme.link');
            mock_email_jobs_service.queueOtpEmail.mockResolvedValueOnce({ success: true });

            const result = await service.signupStep1(dto as any);

            expect(mock_captcha_service.validateCaptcha).toHaveBeenCalledWith('valid-captcha');
            expect(mock_user_service.findByEmail).toHaveBeenCalledWith('john@example.com');
            expect(mock_redis_service.hset).toHaveBeenCalled();
            expect(result).toEqual({ isEmailSent: true });
        });

        it('should throw ConflictException if email already exists', async () => {
            const dto = {
                name: 'John Doe',
                birth_date: '1990-01-01',
                email: 'existing@example.com',
                captcha_token: 'valid-captcha',
            };

            mock_captcha_service.validateCaptcha.mockResolvedValueOnce(true);
            mock_user_service.findByEmail.mockResolvedValueOnce({
                id: '1',
                email: 'existing@example.com',
            });

            await expect(service.signupStep1(dto as any)).rejects.toThrow(ConflictException);
        });

        it('should throw BadRequestException if captcha validation fails', async () => {
            const dto = {
                name: 'John Doe',
                birth_date: '1990-01-01',
                email: 'john@example.com',
                captcha_token: 'invalid-captcha',
            };

            mock_captcha_service.validateCaptcha.mockRejectedValueOnce(
                new Error('Invalid captcha')
            );

            await expect(service.signupStep1(dto as any)).rejects.toThrow(BadRequestException);
        });
    });

    describe('signupStep2', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should verify OTP and return username recommendations', async () => {
            const dto = {
                email: 'john@example.com',
                token: '123456',
            };

            const signup_session = {
                name: 'John Doe',
                birth_date: '1990-01-01',
                email: 'john@example.com',
                email_verified: 'false',
            };

            mock_user_service.findByEmail.mockResolvedValueOnce(null);
            mock_redis_service.hget.mockResolvedValueOnce(signup_session);
            mock_verification_service.validateOtp.mockResolvedValueOnce(true);
            mock_redis_service.hset.mockResolvedValueOnce(true);
            mock_username_service.generateUsernameRecommendationsSingleName = jest
                .fn()
                .mockResolvedValueOnce(['johndoe', 'johndoe123']);

            const result = await service.signupStep2(dto as any);

            expect(mock_verification_service.validateOtp).toHaveBeenCalledWith(
                'john@example.com',
                '123456',
                'email'
            );
            expect(result).toEqual({
                isVerified: true,
                recommendations: ['johndoe', 'johndoe123'],
            });
        });

        it('should throw NotFoundException if signup session not found', async () => {
            const dto = {
                email: 'john@example.com',
                token: '123456',
            };

            mock_user_service.findByEmail.mockResolvedValueOnce(null);
            mock_redis_service.hget.mockResolvedValueOnce(null);

            await expect(service.signupStep2(dto as any)).rejects.toThrow(NotFoundException);
        });

        it('should throw BadRequestException if OTP is invalid', async () => {
            const dto = {
                email: 'john@example.com',
                token: 'wrong-otp',
            };

            const signup_session = {
                name: 'John Doe',
                email: 'john@example.com',
            };

            mock_user_service.findByEmail.mockResolvedValueOnce(null);
            mock_redis_service.hget.mockResolvedValueOnce(signup_session);
            mock_verification_service.validateOtp.mockResolvedValueOnce(false);

            await expect(service.signupStep2(dto as any)).rejects.toThrow(BadRequestException);
        });
    });

    describe('signupStep3', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should create user and return tokens', async () => {
            const dto = {
                email: 'john@example.com',
                password: 'Password123!',
                username: 'johndoe',
                language: 'en',
            };

            const signup_session = {
                name: 'John Doe',
                birth_date: '1990-01-01',
                email: 'john@example.com',
                email_verified: 'true',
            };

            const created_user = {
                id: 'user-123',
                email: 'john@example.com',
                username: 'johndoe',
                name: 'John Doe',
            };

            mock_user_service.findByEmail.mockResolvedValueOnce(null);
            mock_user_service.findByUsername.mockResolvedValueOnce(null);
            mock_redis_service.hget.mockResolvedValueOnce(signup_session);
            (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashed-password');
            mock_user_service.createUser.mockResolvedValueOnce(created_user);
            mock_jwt_service.sign
                .mockReturnValueOnce('access-token')
                .mockReturnValueOnce('refresh-token');
            mock_redis_service.set.mockResolvedValueOnce(true);
            mock_redis_service.sadd.mockResolvedValueOnce(true);
            mock_redis_service.expire.mockResolvedValueOnce(true);
            mock_redis_service.del.mockResolvedValueOnce(true);

            const result = await service.signupStep3(dto as any);

            expect(result.user).toBeDefined();
            expect(result.access_token).toBe('access-token');
            expect(result.refresh_token).toBe('refresh-token');
        });

        it('should throw ConflictException if username is taken', async () => {
            const dto = {
                email: 'john@example.com',
                password: 'Password123!',
                username: 'taken',
                language: 'en',
            };

            mock_user_service.findByEmail.mockResolvedValueOnce(null);
            mock_user_service.findByUsername.mockResolvedValueOnce({ id: '1', username: 'taken' });

            await expect(service.signupStep3(dto as any)).rejects.toThrow(ConflictException);
        });
    });

    describe('checkIdentifier', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should identify email and return user info', async () => {
            const user = { id: 'user-1', email: 'test@example.com' };
            mock_user_service.findByEmail.mockResolvedValueOnce(user);

            const result = await service.checkIdentifier('test@example.com');

            expect(result).toEqual({
                identifier_type: 'email',
                user_id: 'user-1',
            });
        });

        it('should identify phone number and return user info', async () => {
            const user = { id: 'user-2', phone_number: '+1234567890' };
            mock_user_service.findByPhoneNumber.mockResolvedValueOnce(user);

            const result = await service.checkIdentifier('+1234567890');

            expect(result).toEqual({
                identifier_type: 'phone_number',
                user_id: 'user-2',
            });
        });

        it('should identify username and return user info', async () => {
            const user = { id: 'user-3', username: 'johndoe' };
            mock_user_service.findByUsername.mockResolvedValueOnce(user);

            const result = await service.checkIdentifier('johndoe');

            expect(result).toEqual({
                identifier_type: 'username',
                user_id: 'user-3',
            });
        });

        it('should throw NotFoundException if user not found', async () => {
            mock_user_service.findByEmail.mockResolvedValueOnce(null);

            await expect(service.checkIdentifier('notfound@example.com')).rejects.toThrow(
                NotFoundException
            );
        });
    });

    describe('updateUsername', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should update username successfully', async () => {
            const user = { id: 'user-1', username: 'oldname' };
            mock_user_service.findById.mockResolvedValueOnce(user);
            mock_username_service.isUsernameAvailable = jest.fn().mockResolvedValueOnce(true);
            mock_user_service.updateUserById.mockResolvedValueOnce(true);

            const result = await service.updateUsername('user-1', 'newname');

            expect(result).toEqual({ username: 'newname' });
            expect(mock_user_service.updateUserById).toHaveBeenCalledWith('user-1', {
                username: 'newname',
            });
        });

        it('should throw ConflictException if username is taken', async () => {
            const user = { id: 'user-1', username: 'oldname' };
            mock_user_service.findById.mockResolvedValueOnce(user);
            mock_username_service.isUsernameAvailable = jest.fn().mockResolvedValueOnce(false);

            await expect(service.updateUsername('user-1', 'taken')).rejects.toThrow(
                ConflictException
            );
        });
    });

    describe('updateEmail', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should initiate email update process', async () => {
            const user = { id: 'user-1', email: 'old@example.com' };
            mock_user_service.findById.mockResolvedValueOnce(user);
            mock_user_service.findByEmail.mockResolvedValueOnce(null);
            mock_verification_service.generateOtp.mockResolvedValueOnce('123456');
            mock_redis_service.set.mockResolvedValueOnce(true);

            const result = await service.updateEmail('user-1', 'new@example.com');

            expect(result).toBeDefined();
        });
    });

    describe('verifyUpdateEmail', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should verify OTP and update email', async () => {
            const user = { id: 'user-1', email: 'old@example.com' };
            mock_user_service.findById.mockResolvedValueOnce(user);
            mock_verification_service.validateOtp.mockResolvedValueOnce(true);
            mock_redis_service.get.mockResolvedValueOnce('new@example.com');
            mock_user_service.findByEmail.mockResolvedValueOnce(null);
            mock_user_service.updateUserById.mockResolvedValueOnce(true);
            mock_redis_service.del.mockResolvedValueOnce(true);

            const result = await service.verifyUpdateEmail('user-1', 'new@example.com', '123456');

            expect(result).toEqual({ email: 'new@example.com' });
        });
    });

    describe('createOAuthSession', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should create OAuth session in Redis', async () => {
            const user_data = {
                email: 'oauth@example.com',
                name: 'OAuth User',
                google_id: 'google-123',
            };

            mock_redis_service.hset.mockResolvedValueOnce(true);

            const result = await service.createOAuthSession(user_data);

            expect(result).toBe('oauth@example.com');
            expect(mock_redis_service.hset).toHaveBeenCalled();
        });
    });

    describe('oauthCompletionStep1', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should update session with birth_date and return username recommendations', async () => {
            const dto = {
                oauth_session_token: 'session-token',
                birth_date: '1990-01-01',
            };

            const session_data = {
                user_data: JSON.stringify({
                    name: 'OAuth User',
                    email: 'oauth@example.com',
                }),
            };

            mock_redis_service.hget.mockResolvedValueOnce(session_data);
            mock_redis_service.hset.mockResolvedValueOnce(true);
            mock_username_service.generateUsernameRecommendationsSingleName = jest
                .fn()
                .mockResolvedValueOnce(['oauthuser', 'oauthuser123']);

            const result = await service.oauthCompletionStep1(dto as any);

            expect(result.usernames).toEqual(['oauthuser', 'oauthuser123']);
            expect(result.token).toBe('session-token');
        });
    });

    describe('oauthCompletionStep2', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should create user and return tokens', async () => {
            const dto = {
                oauth_session_token: 'session-token',
                username: 'oauthuser',
            };

            const session_data = {
                user_data: JSON.stringify({
                    name: 'OAuth User',
                    email: 'oauth@example.com',
                    birth_date: '1990-01-01',
                    google_id: 'google-123',
                }),
            };

            const created_user = {
                id: 'user-123',
                email: 'oauth@example.com',
                username: 'oauthuser',
            };

            mock_redis_service.hget.mockResolvedValueOnce(session_data);
            mock_username_service.isUsernameAvailable = jest.fn().mockResolvedValueOnce(true);
            mock_user_service.createUser.mockResolvedValueOnce(created_user);
            mock_jwt_service.sign
                .mockReturnValueOnce('access-token')
                .mockReturnValueOnce('refresh-token');
            mock_redis_service.set.mockResolvedValueOnce(true);
            mock_redis_service.sadd.mockResolvedValueOnce(true);
            mock_redis_service.expire.mockResolvedValueOnce(true);
            mock_redis_service.del.mockResolvedValueOnce(true);

            const result = await service.oauthCompletionStep2(dto as any);

            expect(result.user).toBeDefined();
            expect(result.access_token).toBe('access-token');
            expect(result.refresh_token).toBe('refresh-token');
        });
    });

    describe('createExchangeToken', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should create exchange token and store in Redis', async () => {
            const payload = {
                user_id: 'user-123',
                type: 'auth' as const,
            };

            mock_jwt_service.sign.mockReturnValueOnce('exchange-token');
            mock_redis_service.set.mockResolvedValueOnce(true);

            const result = await service.createExchangeToken(payload);

            expect(result).toBe('exchange-token');
            expect(mock_jwt_service.sign).toHaveBeenCalled();
            expect(mock_redis_service.set).toHaveBeenCalled();
        });
    });

    describe('validateExchangeToken', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should validate exchange token and return payload', async () => {
            const mock_payload = { token_id: 'token-123', type: 'auth' };
            const stored_payload = { user_id: 'user-123' };
            const stored_data = JSON.stringify(stored_payload);

            mock_jwt_service.verify = jest.fn().mockReturnValueOnce(mock_payload);
            mock_redis_service.get.mockResolvedValueOnce(stored_data);
            mock_redis_service.del.mockResolvedValueOnce(true);

            const result = await service.validateExchangeToken('exchange-token');

            expect(result).toEqual({ user_id: 'user-123', type: 'auth' });
        });
    });

    describe('confirmPassword', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should confirm password successfully', async () => {
            const user = { id: 'user-1', password: 'hashed-password' };
            const dto = { password: 'correct-password' };

            mock_user_service.findById.mockResolvedValueOnce(user);
            (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

            const result = await service.confirmPassword(dto as any, 'user-1');

            expect(result).toEqual({ valid: true });
        });

        it('should throw ForbiddenException for wrong password', async () => {
            const user = { id: 'user-1', password: 'hashed-password' };
            const dto = { password: 'wrong-password' };

            mock_user_service.findById.mockResolvedValueOnce(user);
            (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

            await expect(service.confirmPassword(dto as any, 'user-1')).rejects.toThrow(
                ForbiddenException
            );
        });

        it('should throw ConflictException for OAuth users without password', async () => {
            const user = { id: 'user-1', password: null };
            const dto = { password: 'any-password' };

            mock_user_service.findById.mockResolvedValueOnce(user);

            await expect(service.confirmPassword(dto as any, 'user-1')).rejects.toThrow(
                ConflictException
            );
        });

        it('should throw NotFoundException if user not found', async () => {
            const dto = { password: 'any-password' };

            mock_user_service.findById.mockResolvedValueOnce(null);

            await expect(service.confirmPassword(dto as any, 'user-1')).rejects.toThrow(
                NotFoundException
            );
        });
    });

    describe('validateUser - additional cases', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should validate user by phone number', async () => {
            const user = {
                id: 'user-2',
                phone_number: '+1234567890',
                password: 'hashedPassword',
            };

            mock_user_service.findByPhoneNumber.mockResolvedValueOnce(user);
            (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

            const result = await service.validateUser('+1234567890', 'password', 'phone_number');

            expect(result).toBe('user-2');
            expect(mock_user_service.findByPhoneNumber).toHaveBeenCalledWith('+1234567890');
        });

        it('should validate user by username', async () => {
            const user = {
                id: 'user-3',
                username: 'testuser',
                password: 'hashedPassword',
            };

            mock_user_service.findByUsername.mockResolvedValueOnce(user);
            (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

            const result = await service.validateUser('testuser', 'password', 'username');

            expect(result).toBe('user-3');
            expect(mock_user_service.findByUsername).toHaveBeenCalledWith('testuser');
        });

        it('should throw for user without password (OAuth)', async () => {
            const user = {
                id: 'user-4',
                email: 'oauth@example.com',
                password: null,
            };

            mock_user_service.findByEmail.mockResolvedValueOnce(user);

            await expect(
                service.validateUser('oauth@example.com', 'password', 'email')
            ).rejects.toThrow(UnauthorizedException);
        });

        it('should handle unverified email in signup session', async () => {
            mock_user_service.findByEmail.mockResolvedValueOnce(null);
            mock_redis_service.hget.mockResolvedValueOnce({
                email: 'unverified@example.com',
                email_verified: 'false',
            });

            await expect(
                service.validateUser('unverified@example.com', 'password', 'email')
            ).rejects.toThrow(UnauthorizedException);
        });

        it('should throw ForbiddenException for unverified user with correct password', async () => {
            const unverified_user = { email: 'test@example.com', password: 'hashedPass' };
            mock_user_service.findByEmail.mockResolvedValueOnce(null);
            mock_redis_service.hget.mockResolvedValueOnce(unverified_user);
            (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

            await expect(
                service.validateUser('test@example.com', 'correctPass', 'email')
            ).rejects.toThrow(new ForbiddenException(ERROR_MESSAGES.EMAIL_NOT_VERIFIED));

            expect(mock_redis_service.hget).toHaveBeenCalledWith('signup:session:test@example.com');
            expect(bcrypt.compare).toHaveBeenCalledWith('correctPass', 'hashedPass');
        });

        it('should throw UnauthorizedException for unverified user with wrong password', async () => {
            const unverified_user = { email: 'test@example.com', password: 'hashedPass' };
            mock_user_service.findByEmail.mockResolvedValueOnce(null);
            mock_redis_service.hget.mockResolvedValueOnce(unverified_user);
            (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

            await expect(
                service.validateUser('test@example.com', 'wrongPass', 'email')
            ).rejects.toThrow(new UnauthorizedException(ERROR_MESSAGES.WRONG_PASSWORD));

            expect(mock_redis_service.hget).toHaveBeenCalledWith('signup:session:test@example.com');
            expect(bcrypt.compare).toHaveBeenCalledWith('wrongPass', 'hashedPass');
        });
    });

    describe('signupStep2 - additional cases', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should throw ConflictException if email already exists', async () => {
            const dto = {
                email: 'existing@example.com',
                token: '123456',
            };

            mock_user_service.findByEmail.mockResolvedValueOnce({
                id: '1',
                email: 'existing@example.com',
            });

            await expect(service.signupStep2(dto as any)).rejects.toThrow(ConflictException);
        });
    });

    describe('signupStep3 - additional cases', () => {
        beforeEach(() => {
            jest.resetAllMocks();
        });

        it('should throw ConflictException if email already exists', async () => {
            const dto = {
                email: 'existing@example.com',
                password: 'Password123!',
                username: 'newuser',
                language: 'en',
            };

            mock_user_service.findByEmail.mockResolvedValueOnce({
                id: '1',
                email: 'existing@example.com',
            });

            await expect(service.signupStep3(dto as any)).rejects.toThrow(ConflictException);
        });

        it('should throw NotFoundException if session not verified', async () => {
            const dto = {
                email: 'john@example.com',
                password: 'Password123!',
                username: 'johndoe',
                language: 'en',
            };

            mock_user_service.findByEmail.mockResolvedValueOnce(null);
            mock_user_service.findByUsername.mockResolvedValueOnce(null);
            mock_redis_service.hget.mockResolvedValueOnce({
                email_verified: 'false',
            });

            await expect(service.signupStep3(dto as any)).rejects.toThrow(NotFoundException);
        });

        it('should throw InternalServerErrorException if user creation fails', async () => {
            const session_data = {
                email: 'test@example.com',
                password: 'hashedPass',
                name: 'Test',
                birth_date: '1990-01-01',
                email_verified: 'true', // Must be string 'true' for verification check
            };
            mock_redis_service.hget.mockResolvedValueOnce(session_data);
            mock_username_service.isUsernameAvailable.mockResolvedValueOnce(true);
            mock_user_service.findByEmail.mockResolvedValueOnce(null);
            mock_user_service.findByUsername.mockResolvedValueOnce(null); // Username not taken
            mock_user_service.createUser.mockResolvedValueOnce(null); // Creation fails

            await expect(
                service.signupStep3({ username: 'testuser', email: 'test@example.com' } as any)
            ).rejects.toThrow(
                new InternalServerErrorException(ERROR_MESSAGES.FAILED_TO_SAVE_IN_DB)
            );

            expect(mock_user_service.createUser).toHaveBeenCalled();
        });
    });

    describe('sendResetPasswordEmail - additional cases', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should throw NotFoundException if user not found after checkIdentifier', async () => {
            jest.spyOn(service, 'checkIdentifier').mockResolvedValueOnce({
                identifier_type: 'email',
                user_id: 'user-123',
            });
            mock_user_service.findById.mockResolvedValueOnce(null);

            await expect(service.sendResetPasswordEmail('test@example.com')).rejects.toThrow(
                new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND)
            );

            expect(service.checkIdentifier).toHaveBeenCalledWith('test@example.com');
            expect(mock_user_service.findById).toHaveBeenCalledWith('user-123');
            expect(mock_verification_service.generateOtp).not.toHaveBeenCalled();
        });
    });

    describe('checkIdentifier - additional cases', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should throw NotFoundException for phone number not found', async () => {
            mock_user_service.findByPhoneNumber.mockResolvedValueOnce(null);

            await expect(service.checkIdentifier('+9999999999')).rejects.toThrow(NotFoundException);
        });

        it('should throw NotFoundException for username not found', async () => {
            mock_user_service.findByUsername.mockResolvedValueOnce(null);

            await expect(service.checkIdentifier('unknownuser')).rejects.toThrow(NotFoundException);
        });
    });

    describe('updateUsername - additional cases', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should throw NotFoundException if user not found', async () => {
            mock_user_service.findById.mockResolvedValueOnce(null);

            await expect(service.updateUsername('user-999', 'newname')).rejects.toThrow(
                NotFoundException
            );
        });
    });

    describe('updateEmail - additional cases', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should throw NotFoundException if user not found', async () => {
            mock_user_service.findById.mockResolvedValueOnce(null);

            await expect(service.updateEmail('user-999', 'new@example.com')).rejects.toThrow(
                NotFoundException
            );
        });

        it('should throw ConflictException if new email already exists', async () => {
            const user = { id: 'user-1', email: 'old@example.com' };
            const existing_user = { id: 'user-2', email: 'new@example.com' };

            mock_user_service.findById.mockResolvedValueOnce(user);
            mock_user_service.findByEmail.mockResolvedValueOnce(existing_user);

            await expect(service.updateEmail('user-1', 'new@example.com')).rejects.toThrow(
                ConflictException
            );
        });
    });

    describe('verifyUpdateEmail - additional cases', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should throw NotFoundException if user not found', async () => {
            mock_user_service.findById.mockResolvedValueOnce(null);

            await expect(
                service.verifyUpdateEmail('user-999', 'new@example.com', '123456')
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw BadRequestException if OTP is invalid', async () => {
            const user = { id: 'user-1', email: 'old@example.com' };

            mock_user_service.findById.mockResolvedValueOnce(user);
            mock_verification_service.validateOtp.mockResolvedValueOnce(false);

            await expect(
                service.verifyUpdateEmail('user-1', 'new@example.com', 'wrong-otp')
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw BadRequestException if stored email does not match', async () => {
            const user = { id: 'user-1', email: 'old@example.com' };

            mock_user_service.findById.mockResolvedValueOnce(user);
            mock_verification_service.validateOtp.mockResolvedValueOnce(true);
            mock_redis_service.get.mockResolvedValueOnce('different@example.com');

            await expect(
                service.verifyUpdateEmail('user-1', 'new@example.com', '123456')
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw ConflictException if new email is already taken', async () => {
            const user = { id: 'user-1', email: 'old@example.com' };

            mock_user_service.findById.mockResolvedValueOnce(user);
            mock_verification_service.validateOtp.mockResolvedValueOnce(true);
            mock_redis_service.get.mockResolvedValueOnce('takenemail@example.com');

            await expect(
                service.verifyUpdateEmail('user-1', 'new@example.com', '123456')
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw ConflictException when email already exists during final check', async () => {
            mock_user_service.findById.mockResolvedValueOnce({ id: 'user-123' });
            mock_verification_service.validateOtp.mockResolvedValueOnce(true);
            mock_redis_service.get.mockResolvedValueOnce('taken@example.com'); // Use .get() not .hget()
            mock_user_service.findByEmail.mockResolvedValueOnce({ id: 'another-user' });

            await expect(
                service.verifyUpdateEmail('user-123', 'taken@example.com', '123456')
            ).rejects.toThrow(new ConflictException(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS));

            expect(mock_user_service.findByEmail).toHaveBeenCalledWith('taken@example.com');
            expect(mock_user_service.updateUserById).not.toHaveBeenCalled();
        });
    });

    describe('oauthCompletionStep1 - additional cases', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should throw NotFoundException if session not found', async () => {
            const dto = {
                oauth_session_token: 'invalid-token',
                birth_date: '1990-01-01',
            };

            mock_redis_service.hget.mockResolvedValueOnce(null);

            await expect(service.oauthCompletionStep1(dto as any)).rejects.toThrow(
                new NotFoundException(ERROR_MESSAGES.INVALID_OAUTH_SESSION_TOKEN)
            );

            expect(mock_redis_service.hget).toHaveBeenCalledWith('oauth:session:invalid-token');
        });
    });

    describe('oauthCompletionStep2 - additional cases', () => {
        beforeEach(() => {
            jest.resetAllMocks();
        });

        it('should throw NotFoundException if session not found', async () => {
            const dto = {
                oauth_session_token: 'invalid-token',
                username: 'testuser',
            };

            mock_redis_service.hget.mockResolvedValueOnce(null);

            await expect(service.oauthCompletionStep2(dto as any)).rejects.toThrow(
                NotFoundException
            );
        });

        it('should throw ConflictException if username is taken', async () => {
            const dto = {
                oauth_session_token: 'session-token',
                username: 'taken',
            };

            const session_data = {
                birth_date: '1990-01-01',
                oauth_provider: 'google',
                user_data: JSON.stringify({
                    google_id: 'google-123',
                    email: 'oauth@example.com',
                    first_name: 'John',
                    last_name: 'Doe',
                }),
            };

            mock_redis_service.hget.mockResolvedValueOnce(session_data);
            mock_username_service.isUsernameAvailable.mockResolvedValueOnce(false);

            await expect(service.oauthCompletionStep2(dto as any)).rejects.toThrow(
                new ConflictException(ERROR_MESSAGES.USERNAME_ALREADY_TAKEN)
            );

            expect(mock_username_service.isUsernameAvailable).toHaveBeenCalledWith('taken');
        });
    });

    describe('validateExchangeToken - additional cases', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should throw UnauthorizedException if token is invalid', async () => {
            mock_jwt_service.verify = jest.fn().mockImplementationOnce(() => {
                throw new Error('Invalid token');
            });

            await expect(service.validateExchangeToken('invalid-token')).rejects.toThrow(
                UnauthorizedException
            );
        });

        it('should throw UnauthorizedException if token not found in Redis', async () => {
            const mock_payload = { token_id: 'token-123', type: 'auth' };

            mock_jwt_service.verify = jest.fn().mockReturnValueOnce(mock_payload);
            mock_redis_service.get.mockResolvedValueOnce(null);

            await expect(service.validateExchangeToken('exchange-token')).rejects.toThrow(
                UnauthorizedException
            );
        });
    });

    /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/naming-convention */
    describe('verifyGoogleMobileToken', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should verify Google mobile token successfully', async () => {
            const mock_payload = {
                sub: 'google-123',
                email: 'test@example.com',
                given_name: 'John',
                family_name: 'Doe',
                picture: 'http://avatar.com/john',
            };
            const mock_ticket = { getPayload: jest.fn().mockReturnValue(mock_payload) };

            // Mock OAuth2Client constructor
            const { OAuth2Client } = require('google-auth-library');
            jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue(mock_ticket);

            const mock_validation_result = {
                user: { id: 'user-1', email: 'test@example.com' },
                needs_completion: false,
            };
            jest.spyOn(service, 'validateGoogleUser').mockResolvedValue(
                mock_validation_result as any
            );

            const result = await service.verifyGoogleMobileToken('valid-token');

            expect(result).toEqual(mock_validation_result);
            expect(service.validateGoogleUser).toHaveBeenCalledWith(
                expect.objectContaining({
                    google_id: 'google-123',
                    email: 'test@example.com',
                    first_name: 'John',
                    last_name: 'Doe',
                })
            );
        });

        it('should throw UnauthorizedException if payload is null', async () => {
            const mock_ticket = { getPayload: jest.fn().mockReturnValue(null) };
            const { OAuth2Client } = require('google-auth-library');
            jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue(mock_ticket);

            await expect(service.verifyGoogleMobileToken('invalid-token')).rejects.toThrow(
                new UnauthorizedException(ERROR_MESSAGES.GOOGLE_TOKEN_INVALID)
            );
        });

        it('should throw BadRequestException if email not provided', async () => {
            const mock_payload = {
                sub: 'google-123',
                // email missing
                given_name: 'John',
            };
            const mock_ticket = { getPayload: jest.fn().mockReturnValue(mock_payload) };
            const { OAuth2Client } = require('google-auth-library');
            jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue(mock_ticket);

            await expect(service.verifyGoogleMobileToken('token')).rejects.toThrow(
                new BadRequestException(ERROR_MESSAGES.EMAIL_NOT_PROVIDED_BY_OAUTH_GITHUB)
            );
        });

        it('should throw UnauthorizedException on verification error', async () => {
            const { OAuth2Client } = require('google-auth-library');
            jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockRejectedValue(
                new Error('Verification failed')
            );

            await expect(service.verifyGoogleMobileToken('bad-token')).rejects.toThrow(
                new UnauthorizedException(ERROR_MESSAGES.GOOGLE_TOKEN_INVALID)
            );
        });
    });

    describe('getGitHubAccessToken', () => {
        beforeEach(() => {
            jest.clearAllMocks();
            mock_config_service.get.mockImplementation((key: string) => {
                if (key === 'GITHUB_MOBILE_CLIENT_ID') return 'client-id';
                if (key === 'GITHUB_MOBILE_CLIENT_SECRET') return 'client-secret';
                return null;
            });
        });

        it('should get GitHub access token successfully', async () => {
            const axios = require('axios');
            jest.spyOn(axios, 'post').mockResolvedValue({
                data: { access_token: 'github-access-token' },
            });

            const result = await service.getGitHubAccessToken(
                'code123',
                'http://redirect',
                'verifier'
            );

            expect(result).toBe('github-access-token');
            expect(axios.post).toHaveBeenCalledWith(
                'https://github.com/login/oauth/access_token',
                expect.objectContaining({
                    client_id: 'client-id',
                    code: 'code123',
                    redirect_uri: 'http://redirect',
                    code_verifier: 'verifier',
                }),
                expect.any(Object)
            );
        });

        it('should throw UnauthorizedException for bad_verification_code error', async () => {
            const axios = require('axios');
            jest.spyOn(axios, 'post').mockResolvedValue({
                data: {
                    error: 'bad_verification_code',
                    error_description: 'Bad verification code',
                },
            });

            await expect(
                service.getGitHubAccessToken('bad-code', 'http://redirect', 'verifier')
            ).rejects.toThrow(new UnauthorizedException(ERROR_MESSAGES.GITHUB_CODE_INVALID));
        });

        it('should throw UnauthorizedException for invalid_grant error', async () => {
            const axios = require('axios');
            jest.spyOn(axios, 'post').mockResolvedValue({
                data: {
                    error: 'invalid_grant',
                    error_description: 'Invalid grant',
                },
            });

            await expect(
                service.getGitHubAccessToken('code', 'http://redirect', 'bad-verifier')
            ).rejects.toThrow(
                new UnauthorizedException(ERROR_MESSAGES.GITHUB_CODE_VERIFIER_REQUIRED)
            );
        });

        it('should throw UnauthorizedException for other GitHub errors', async () => {
            const axios = require('axios');
            jest.spyOn(axios, 'post').mockResolvedValue({
                data: {
                    error: 'some_error',
                    error_description: 'Some error occurred',
                },
            });

            await expect(
                service.getGitHubAccessToken('code', 'http://redirect', 'verifier')
            ).rejects.toThrow(UnauthorizedException);
        });

        it('should throw UnauthorizedException if access_token is missing', async () => {
            const axios = require('axios');
            jest.spyOn(axios, 'post').mockResolvedValue({
                data: {}, // No access_token
            });

            await expect(
                service.getGitHubAccessToken('code', 'http://redirect', 'verifier')
            ).rejects.toThrow(new UnauthorizedException(ERROR_MESSAGES.GITHUB_TOKEN_INVALID));
        });

        it('should throw UnauthorizedException on network error', async () => {
            const axios = require('axios');
            jest.spyOn(axios, 'post').mockRejectedValue(new Error('Network error'));

            await expect(
                service.getGitHubAccessToken('code', 'http://redirect', 'verifier')
            ).rejects.toThrow(new UnauthorizedException(ERROR_MESSAGES.GITHUB_OAUTH_FAILED));
        });
    });

    describe('verifyGitHubMobileToken', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should verify GitHub mobile token successfully', async () => {
            jest.spyOn(service, 'getGitHubAccessToken').mockResolvedValue('access-token');

            global.fetch = jest
                .fn()
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        id: 12345,
                        login: 'johndoe',
                        name: 'John Doe',
                        email: 'john@example.com',
                        avatar_url: 'http://avatar.com/john',
                    }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => [
                        { email: 'john@example.com', primary: true, verified: true },
                    ],
                }) as any;

            const mock_validation_result = {
                user: { id: 'user-1' },
                needs_completion: false,
            };
            jest.spyOn(service, 'validateGitHubUser').mockResolvedValue(
                mock_validation_result as any
            );

            const result = await service.verifyGitHubMobileToken(
                'code',
                'http://redirect',
                'verifier'
            );

            expect(result).toEqual(mock_validation_result);
            expect(service.getGitHubAccessToken).toHaveBeenCalledWith(
                'code',
                'http://redirect',
                'verifier'
            );
        });

        it('should throw UnauthorizedException if user fetch fails', async () => {
            jest.spyOn(service, 'getGitHubAccessToken').mockResolvedValue('access-token');

            global.fetch = jest.fn().mockResolvedValueOnce({
                ok: false,
                text: async () => 'User fetch failed',
            }) as any;

            await expect(
                service.verifyGitHubMobileToken('code', 'http://redirect', 'verifier')
            ).rejects.toThrow(new UnauthorizedException(ERROR_MESSAGES.GITHUB_TOKEN_INVALID));
        });

        it('should throw BadRequestException if email not provided', async () => {
            jest.spyOn(service, 'getGitHubAccessToken').mockResolvedValue('access-token');

            global.fetch = jest
                .fn()
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        id: 12345,
                        login: 'johndoe',
                        name: 'John Doe',
                        email: null, // No email
                        avatar_url: 'http://avatar.com/john',
                    }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => [], // No emails
                }) as any;

            await expect(
                service.verifyGitHubMobileToken('code', 'http://redirect', 'verifier')
            ).rejects.toThrow(
                new BadRequestException(ERROR_MESSAGES.EMAIL_NOT_PROVIDED_BY_OAUTH_GITHUB)
            );
        });

        it('should throw UnauthorizedException on general error', async () => {
            jest.spyOn(service, 'getGitHubAccessToken').mockRejectedValue(
                new Error('Token fetch failed')
            );

            await expect(
                service.verifyGitHubMobileToken('code', 'http://redirect', 'verifier')
            ).rejects.toThrow(UnauthorizedException);
        });
    });
    /* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/naming-convention */
});

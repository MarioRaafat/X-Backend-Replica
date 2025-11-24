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
import { EmailService } from 'src/communication/email.service';
import { CaptchaService } from './captcha.service';
import { ConfigService } from '@nestjs/config';
import { BackgroundJobsService } from 'src/background-jobs/background-jobs';
import {
    BadRequestException,
    ConflictException,
    InternalServerErrorException,
    NotFoundException,
    UnauthorizedException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { ERROR_MESSAGES } from 'src/constants/swagger-messages';

describe('AuthService', () => {
    let service: AuthService;

    const mock_user_service = {
        findByEmail: jest.fn(async (email: string) => {
            return {
                id: '1',
                email,
                password: 'hashedPassword',
                name: 'Test User',
                phone_number: '1234567890',
            };
        }),
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
    };
    const mock_verification_service = {
        generateOtp: jest.fn(),
        generateNotMeLink: jest.fn(),
        validateOtp: jest.fn(),
        generatePasswordResetToken: jest.fn(),
        validatePasswordResetToken: jest.fn(),
        validateNotMeLink: jest.fn(),
    };
    const mock_email_service = {
        sendEmail: jest.fn(),
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
                { provide: EmailService, useValue: mock_email_service },
                { provide: BackgroundJobsService, useValue: mock_background_jobs_service },
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
            (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
            const id = await service.validateUser('test@example.com', 'password', 'email');
            expect(id).toBe('1');
        });

        it('should throw "Wrong password" when password is incorrect', async () => {
            (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
            await expect(
                service.validateUser('test@example.com', 'wrongpassword', 'email')
            ).rejects.toThrow(ERROR_MESSAGES.WRONG_PASSWORD);
        });

        it('should throw "User not found" when user does not exist', async () => {
            (mock_user_service.findByEmail as jest.Mock).mockResolvedValueOnce(null);
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
            mock_background_jobs_service.queueOtpEmail = jest
                .fn()
                .mockResolvedValueOnce({ success: true });

            const result = await service.generateEmailVerification('test@example.com');

            expect(mock_redis_service.hget).toHaveBeenCalledWith('signup:session:test@example.com');
            expect(mock_verification_service.generateOtp).toHaveBeenCalledWith(
                'test@example.com',
                'email'
            );
            expect(mock_verification_service.generateNotMeLink).toHaveBeenCalled();
            expect(mock_background_jobs_service.queueOtpEmail).toHaveBeenCalledWith(
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
            expect(mock_email_service.sendEmail).not.toHaveBeenCalled();
        });

        it('should throw InternalServerErrorException if emailService.sendEmail fails', async () => {
            mock_redis_service.hget = jest.fn().mockResolvedValueOnce(mock_user);
            mock_verification_service.generateOtp = jest.fn().mockResolvedValueOnce('123456');
            mock_verification_service.generateNotMeLink = jest
                .fn()
                .mockResolvedValueOnce('https://notme.link');
            mock_background_jobs_service.queueOtpEmail = jest
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
            mock_background_jobs_service.queueOtpEmail.mockResolvedValueOnce({ success: true });

            const result = await service.sendResetPasswordEmail('test@example.com');

            expect(mock_user_service.findById).toHaveBeenCalledWith('user-1');
            expect(mock_verification_service.generateOtp).toHaveBeenCalledWith(
                'user-1',
                'password'
            );
            expect(mock_background_jobs_service.queueOtpEmail).toHaveBeenCalledWith(
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
            expect(mock_background_jobs_service.queueOtpEmail).not.toHaveBeenCalled();
        });

        it('should throw InternalServerErrorException if email sending fails', async () => {
            mock_user_service.findByEmail.mockResolvedValueOnce(mock_user);
            mock_user_service.findById.mockResolvedValueOnce(mock_user);
            mock_verification_service.generateOtp.mockResolvedValueOnce('123456');
            mock_background_jobs_service.queueOtpEmail.mockResolvedValueOnce({ success: false });

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

            (mock_user_service.findByEmail as jest.Mock).mockResolvedValueOnce(
                user_by_email as any
            );
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
            (mock_user_service.findByEmail as jest.Mock).mockResolvedValueOnce(
                user_by_email as any
            );
            mock_user_service.updateUserById.mockResolvedValueOnce(null);

            await expect(service.validateGoogleUser(mock_google_user)).rejects.toThrow(
                new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
            );
        });

        it('should create a new user if not found by googleId or email', async () => {
            mock_user_service.findByGoogleId.mockResolvedValueOnce(null);
            (mock_user_service.findByEmail as jest.Mock).mockResolvedValueOnce(null);

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

            (mock_user_service.findByEmail as jest.Mock).mockResolvedValueOnce(user_by_email);
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
            (mock_user_service.findByEmail as jest.Mock).mockResolvedValueOnce(user_by_email);
            mock_user_service.updateUserById.mockResolvedValueOnce(null);

            await expect(service.validateFacebookUser(mock_facebook_user)).rejects.toThrow(
                new InternalServerErrorException(ERROR_MESSAGES.FAILED_TO_UPDATE_IN_DB)
            );
        });

        it('should create a new user if not found by facebook_id or email', async () => {
            mock_user_service.findByFacebookId.mockResolvedValueOnce(null);
            (mock_user_service.findByEmail as jest.Mock).mockResolvedValueOnce(null);

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

            (mock_user_service.findByEmail as jest.Mock).mockResolvedValueOnce(user_by_email);
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
            (mock_user_service.findByEmail as jest.Mock).mockResolvedValueOnce(user_by_email);
            mock_user_service.updateUserById.mockResolvedValueOnce(null);

            await expect(service.validateGitHubUser(mock_git_hub_user)).rejects.toThrow(
                new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
            );
        });

        it('should create a new user if not found by github_id or email', async () => {
            mock_user_service.findByGithubId.mockResolvedValueOnce(null);
            (mock_user_service.findByEmail as jest.Mock).mockResolvedValueOnce(null);

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
});

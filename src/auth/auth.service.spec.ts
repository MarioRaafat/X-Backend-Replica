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
import { BackgroundJobsService } from 'src/background-jobs/background-jobs.service';
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

    const mockUserService = {
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

    const mockJwtService = {
        sign: jest.fn(),
        verifyAsync: jest.fn(),
    };
    const mockRedisService = {
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
    const mockUsernameService = {
        generateUsername: jest.fn(),
    };
    const mockVerificationService = {
        generateOtp: jest.fn(),
        generateNotMeLink: jest.fn(),
        validateOtp: jest.fn(),
        generatePasswordResetToken: jest.fn(),
        validatePasswordResetToken: jest.fn(),
        validateNotMeLink: jest.fn(),
    };
    const mockEmailService = {
        sendEmail: jest.fn(),
    };
    const mockCaptchaService = {
        createCaptcha: jest.fn(),
        validateCaptcha: jest.fn(),
    };
    const mockConfigService = {
        get: jest.fn(),
    };
    const mockBackgroundJobsService = {
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
                { provide: UserRepository, useValue: mockUserService },
                { provide: JwtService, useValue: mockJwtService },
                { provide: UsernameService, useValue: mockUsernameService },
                { provide: RedisService, useValue: mockRedisService },
                { provide: VerificationService, useValue: mockVerificationService },
                { provide: EmailService, useValue: mockEmailService },
                { provide: BackgroundJobsService, useValue: mockBackgroundJobsService },
                { provide: CaptchaService, useValue: mockCaptchaService },
                { provide: ConfigService, useValue: mockConfigService },
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
            await expect(service.validateUser('test@example.com', 'wrongpassword', 'email')).rejects.toThrow(
                ERROR_MESSAGES.WRONG_PASSWORD
            );
        });

        it('should throw "User not found" when user does not exist', async () => {
            (mockUserService.findByEmail as jest.Mock).mockResolvedValueOnce(null);
            await expect(service.validateUser('missing@example.com', 'password', 'email')).rejects.toThrow(
                ERROR_MESSAGES.USER_NOT_FOUND
            );
        });
    });

    // -------- generateTokens() tests --------
    describe('generateTokens', () => {
        it('should be defined', () => {
            expect(service.generateTokens).toBeDefined();
        });

        it('should generate access and refresh tokens and store them in Redis', async () => {
            const mockAccessToken = 'mock-access-token';
            const mockRefreshToken = 'mock-refresh-token';
            const mockJti = 'mock-jti';

            mockJwtService.sign
                .mockReturnValueOnce(mockAccessToken) // first call → access token
                .mockReturnValueOnce(mockRefreshToken); // second call → refresh token

            const result = await service.generateTokens('user-1');

            expect(result).toEqual({
                access_token: mockAccessToken,
                refresh_token: mockRefreshToken,
            });

            // Verify JWT sign calls
            expect(mockJwtService.sign).toHaveBeenCalledTimes(2);
            expect(mockJwtService.sign).toHaveBeenNthCalledWith(
                1,
                { id: 'user-1' },
                expect.objectContaining({
                    secret: process.env.JWT_TOKEN_SECRET,
                    expiresIn: process.env.JWT_TOKEN_EXPIRATION_TIME,
                })
            );
            expect(mockJwtService.sign).toHaveBeenNthCalledWith(
                2,
                { id: 'user-1', jti: mockJti },
                expect.objectContaining({
                    secret: process.env.JWT_REFRESH_SECRET,
                    expiresIn: process.env.JWT_REFRESH_EXPIRATION_TIME,
                })
            );

            // Verify Redis interactions
            expect(mockRedisService.set).toHaveBeenCalledWith(
                `refresh:${mockJti}`,
                JSON.stringify({ id: 'user-1' }),
                7 * 24 * 60 * 60
            );
            expect(mockRedisService.sadd).toHaveBeenCalledWith(
                `user:user-1:refreshTokens`,
                mockJti
            );
            expect(mockRedisService.expire).toHaveBeenCalledWith(
                `user:user-1:refreshTokens`,
                7 * 24 * 60 * 60
            );
        });

        it('should throw if jwtService.sign throws an error', async () => {
            //used mockImplementationOnce for sync error throwing
            mockJwtService.sign.mockImplementationOnce(() => {
                throw new Error('JWT error');
            });

            await expect(service.generateTokens('user-1')).rejects.toThrow('JWT error');
        });

        it('should throw if redisService.set rejects', async () => {
            mockJwtService.sign
                .mockReturnValueOnce('mock-access-token')
                .mockReturnValueOnce('mock-refresh-token');
            //used mockRejectedValueOnce for async error throwing
            mockRedisService.set.mockRejectedValueOnce(new Error('Redis down'));

            await expect(service.generateTokens('user-1')).rejects.toThrow('Redis down');
        });
    });

    describe('login', () => {
        it('should be defined', () => {
            expect(service.login).toBeDefined();
        });

        it('should return user and tokens on successful login', async () => {
            const mockTokens = { access_token: 'access', refresh_token: 'refresh' };

            const mockUser = {
                id: 'user-1',
                email: 'test@example.com',
                name: 'Test User',
                phone_number: '1234567890',
            };
            // Set up findById to return mockUser when called with 'user-1'
            mockUserService.findById.mockResolvedValueOnce(mockUser);
            //mock the methods used inside login()
            jest.spyOn(service, 'generateTokens').mockResolvedValue(mockTokens);
            jest.spyOn(service, 'validateUser').mockResolvedValue('user-1');

            const result = await service.login({ identifier: 'test@example.com', type: 'email', password: 'password' });

            expect(service.validateUser).toHaveBeenCalledWith('test@example.com', 'password', 'email');

            expect(service.generateTokens).toHaveBeenCalledWith('user-1');

            expect(result).toEqual({
                user: mockUser,
                ...mockTokens,
            });
        });
        it('should throw if validateUser throws', async () => {
            jest.spyOn(service, 'validateUser').mockRejectedValue(new Error('some random failure'));

            await expect(
                service.login({ identifier: 'test@example.com', type: 'email', password: 'password' })
            ).rejects.toThrow();
        });

        it('should throw if findById returns null', async () => {
            jest.spyOn(service, 'validateUser').mockResolvedValue('user-1');
            mockUserService.findById.mockResolvedValueOnce(null);

            await expect(
                service.login({ identifier: 'test@example.com', type: 'email', password: 'password' })
            ).rejects.toThrow(ERROR_MESSAGES.USER_NOT_FOUND);
        });

        it('should throw if generateTokens throws', async () => {
            jest.spyOn(service, 'validateUser').mockResolvedValue('user-1');
            mockUserService.findById.mockResolvedValueOnce({
                id: 'user-1',
                email: 'test@example.com',
                name: 'Test User',
                phone_number: '1234567890',
            });
            jest.spyOn(service, 'generateTokens').mockRejectedValue(new Error('token error'));

            await expect(
                service.login({ identifier: 'test@example.com', type: 'email', password: 'password' })
            ).rejects.toThrow();
        });
    });

    describe('logout', () => {
        let mockRes: any;

        beforeEach(() => {
            mockRes = { clearCookie: jest.fn() };
        });

        it('should logout successfully and clear cookies', async () => {
            const mockPayload = { id: 'user-1', jti: 'jti-123' };

            mockJwtService.verifyAsync.mockResolvedValueOnce(mockPayload);
            mockRedisService.del.mockResolvedValueOnce(1);
            mockRedisService.srem.mockResolvedValueOnce(1);

            const result = await service.logout('valid-refresh-token', mockRes);

            // verify jwt call
            expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('valid-refresh-token', {
                secret: process.env.JWT_REFRESH_SECRET,
            });

            // verify redis cleanup
            expect(mockRedisService.del).toHaveBeenCalledWith(`refresh:${mockPayload.jti}`);
            expect(mockRedisService.srem).toHaveBeenCalledWith(
                `user:${mockPayload.id}:refreshTokens`,
                mockPayload.jti
            );

            // verify cookie cleared
            expect(mockRes.clearCookie).toHaveBeenCalledWith('refresh_token', {
                httpOnly: true,
                secure: true,
                sameSite: 'strict',
            });

            expect(result).toEqual({});
        });

        it('should throw UnauthorizedException if token is invalid', async () => {
            mockJwtService.verifyAsync.mockRejectedValueOnce(new Error('Invalid token'));

            await expect(service.logout('invalid-token', mockRes)).rejects.toThrow(
                new UnauthorizedException(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
            );

            expect(mockRedisService.del).not.toHaveBeenCalled();
            expect(mockRedisService.srem).not.toHaveBeenCalled();
            expect(mockRes.clearCookie).not.toHaveBeenCalled();
        });

        it('should throw UnauthorizedException if redis throws an error', async () => {
            const mockPayload = { id: 'user-1', jti: 'jti-123' };
            mockJwtService.verifyAsync.mockResolvedValueOnce(mockPayload);
            mockRedisService.del.mockRejectedValueOnce(new Error('Redis down'));

            await expect(service.logout('valid-refresh-token', mockRes)).rejects.toThrow();

            // jwt verified but redis failed
            expect(mockJwtService.verifyAsync).toHaveBeenCalled();
            expect(mockRes.clearCookie).not.toHaveBeenCalled();
        });
    });

    describe('logoutAll', () => {
        let mockRes: any;

        beforeEach(() => {
            mockRes = { clearCookie: jest.fn() };
        });

        it('should log out from all devices successfully and clear cookies', async () => {
            const mockPayload = { id: 'user-1', jti: 'jti-123' };
            const mockTokens = ['token1', 'token2'];

            // Mock JWT + Redis
            mockJwtService.verifyAsync.mockResolvedValueOnce(mockPayload);
            mockRedisService.smembers = jest.fn().mockResolvedValueOnce(mockTokens);

            // Create a mock pipeline
            const execMock = jest.fn().mockResolvedValueOnce([]);
            const delMock = jest.fn().mockReturnThis();
            const mockPipeline = {
                del: delMock,
                exec: execMock,
            };

            mockRedisService.pipeline = jest.fn(() => mockPipeline);

            const result = await service.logoutAll('valid-refresh-token', mockRes);

            // Verify verifyAsync was called
            expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('valid-refresh-token', {
                secret: process.env.JWT_REFRESH_SECRET,
            });

            // Verify Redis operations
            expect(mockRedisService.smembers).toHaveBeenCalledWith('user:user-1:refreshTokens');
            expect(mockRedisService.pipeline).toHaveBeenCalled();
            expect(delMock).toHaveBeenCalledTimes(3); // token1, token2, and the user set
            expect(execMock).toHaveBeenCalled();

            // Verify cookie clearing
            expect(mockRes.clearCookie).toHaveBeenCalledWith('refresh_token', {
                httpOnly: true,
                secure: true,
                sameSite: 'strict',
            });

            expect(result).toEqual({});
        });

        it('should do nothing with Redis if user has no refresh tokens', async () => {
            const mockPayload = { id: 'user-1', jti: 'jti-123' };

            mockJwtService.verifyAsync.mockResolvedValueOnce(mockPayload);
            mockRedisService.smembers = jest.fn().mockResolvedValueOnce([]);
            mockRedisService.pipeline = jest.fn();

            const result = await service.logoutAll('valid-refresh-token', mockRes);

            expect(mockRedisService.pipeline).not.toHaveBeenCalled();
            expect(mockRes.clearCookie).toHaveBeenCalled();
            expect(result).toEqual({});
        });

        it('should throw UnauthorizedException if token is invalid', async () => {
            mockJwtService.verifyAsync.mockRejectedValueOnce(new Error('Invalid token'));

            await expect(service.logoutAll('invalid-token', mockRes)).rejects.toThrow(
                new UnauthorizedException(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
            );

            expect(mockRedisService.smembers).not.toHaveBeenCalled();
            expect(mockRedisService.pipeline).not.toHaveBeenCalled();
            expect(mockRes.clearCookie).not.toHaveBeenCalled();
        });

        // it('should throw if Redis pipeline.exec fails', async () => {
        //   const mockPayload = { id: 'user-1', jti: 'jti-123' };
        //   const mockTokens = ['token1'];

        //   mockJwtService.verifyAsync.mockResolvedValueOnce(mockPayload);
        //   mockRedisService.smembers = jest.fn().mockResolvedValueOnce(mockTokens);

        //   const mockPipeline = {
        //     del: jest.fn().mockReturnThis(),
        //     exec: jest.fn().mockRejectedValueOnce(new Error('Redis down')),
        //   };
        //   mockRedisService.pipeline = jest.fn(() => mockPipeline);

        //   await expect(service.logoutAll('valid-token', mockRes as any)).rejects.toThrow('Redis down');

        //   expect(mockRedisService.pipeline).toHaveBeenCalled();
        //   expect(mockRes.clearCookie).not.toHaveBeenCalled();
        // });
    });

    describe('generateEmailVerification', () => {
        const mockUser = { name: 'John' };

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should send verification email successfully', async () => {
            // Mock user in Redis
            mockRedisService.hget = jest.fn().mockResolvedValueOnce(mockUser);
            mockVerificationService.generateOtp = jest.fn().mockResolvedValueOnce('123456');
            mockVerificationService.generateNotMeLink = jest
                .fn()
                .mockResolvedValueOnce('https://notme.link');
            mockBackgroundJobsService.queueOtpEmail = jest.fn().mockResolvedValueOnce({ success: true });

            const result = await service.generateEmailVerification('test@example.com');

            expect(mockRedisService.hget).toHaveBeenCalledWith('signup:session:test@example.com');
            expect(mockVerificationService.generateOtp).toHaveBeenCalledWith(
                'test@example.com',
                'email'
            );
            expect(mockVerificationService.generateNotMeLink).toHaveBeenCalled();
            expect(mockBackgroundJobsService.queueOtpEmail).toHaveBeenCalledWith(
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
            mockRedisService.hget = jest.fn().mockResolvedValueOnce(null);

            await expect(service.generateEmailVerification('missing@example.com')).rejects.toThrow(
                new NotFoundException('User not found or already verified')
            );

            expect(mockVerificationService.generateOtp).not.toHaveBeenCalled();
            expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
        });

        it('should throw InternalServerErrorException if emailService.sendEmail fails', async () => {
            mockRedisService.hget = jest.fn().mockResolvedValueOnce(mockUser);
            mockVerificationService.generateOtp = jest.fn().mockResolvedValueOnce('123456');
            mockVerificationService.generateNotMeLink = jest
                .fn()
                .mockResolvedValueOnce('https://notme.link');
            mockBackgroundJobsService.queueOtpEmail = jest.fn().mockResolvedValueOnce({ success: false });

            await expect(service.generateEmailVerification('test@example.com')).rejects.toThrow(
                new InternalServerErrorException(ERROR_MESSAGES.FAILED_TO_SEND_OTP_EMAIL)
            );
        });
    });

    // describe('register', () => {
    //   const mockRegisterDto:RegisterDto = {
    //     email: 'test@example.com',
    //     password: 'password123',
    //     confirmPassword: 'password123',
    //     captchaToken: 'valid-captcha',
    //     firstName: 'John',
    //     lastName: 'Doe',
    //     phoneNumber: '1234567890',
    //   };

    //   beforeEach(() => {
    //     jest.clearAllMocks();
    //   });

    //   it('should register successfully and send verification email', async () => {
    //     mockCaptchaService.validateCaptcha.mockResolvedValueOnce(true);
    //     mockRedisService.hget.mockResolvedValueOnce(null);
    //     (mockUserService.findByEmail as jest.Mock).mockResolvedValueOnce(null);
    //     (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashedPass');
    //     mockRedisService.hset.mockResolvedValueOnce(true);
    //     mockConfigService.get.mockReturnValueOnce(3600);
    //     jest.spyOn(service, 'generateEmailVerification').mockResolvedValueOnce({ isEmailSent: true });

    //     const result = await service.register(mockRegisterDto);

    //     expect(mockCaptchaService.validateCaptcha).toHaveBeenCalledWith('valid-captcha');
    //     expect(mockRedisService.hget).toHaveBeenCalledWith('user:test@example.com');
    //     expect(mockUserService.findByEmail).toHaveBeenCalledWith('test@example.com');
    //     expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    //     expect(mockRedisService.hset).toHaveBeenCalledWith(
    //       'user:test@example.com',
    //       expect.objectContaining({
    //         firstName: 'John',
    //         lastName: 'Doe',
    //         password: 'hashedPass',
    //       }),
    //       3600,
    //     );
    //     expect(service.generateEmailVerification).toHaveBeenCalledWith('test@example.com');
    //     expect(result).toEqual({ isEmailSent: true });
    //   });

    //   it('should throw BadRequestException if CAPTCHA fails', async () => {
    //     mockCaptchaService.validateCaptcha.mockRejectedValueOnce(new Error('Invalid captcha'));

    //     await expect(service.register(mockRegisterDto)).rejects.toThrow(
    //       new BadRequestException('CAPTCHA verification failed. Please try again.'),
    //     );

    //     expect(mockRedisService.hget).not.toHaveBeenCalled();
    //   });

    //   it('should throw ConflictException if email is pending in Redis', async () => {
    //     mockCaptchaService.validateCaptcha.mockResolvedValueOnce(true);
    //     mockRedisService.hget.mockResolvedValueOnce({ some: 'pendingUser' });

    //     await expect(service.register(mockRegisterDto)).rejects.toThrow(
    //       new ConflictException('Email already exists'),
    //     );

    //     expect(mockUserService.findByEmail).not.toHaveBeenCalled();
    //   });

    //   it('should throw ConflictException if email already exists in DB', async () => {
    //     mockCaptchaService.validateCaptcha.mockResolvedValueOnce(true);
    //     mockRedisService.hget.mockResolvedValueOnce(null);
    //     (mockUserService.findByEmail as jest.Mock).mockResolvedValueOnce({ id: '1' });

    //     await expect(service.register(mockRegisterDto)).rejects.toThrow(
    //       new ConflictException('Email already exists'),
    //     );

    //     expect(bcrypt.hash).not.toHaveBeenCalled();
    //   });

    //   it('should throw BadRequestException if passwords do not match', async () => {
    //     mockCaptchaService.validateCaptcha.mockResolvedValueOnce(true);
    //     mockRedisService.hget.mockResolvedValueOnce(null);
    //     (mockUserService.findByEmail as jest.Mock).mockResolvedValueOnce(null);

    //     const badDto = { ...mockRegisterDto, confirmPassword: 'wrong' };

    //     await expect(service.register(badDto)).rejects.toThrow(
    //       new BadRequestException('Confirmation password must match password'),
    //     );

    //     expect(bcrypt.hash).not.toHaveBeenCalled();
    //   });

    //   it('should propagate error if generateEmailVerification fails', async () => {
    //     mockCaptchaService.validateCaptcha.mockResolvedValueOnce(true);
    //     mockRedisService.hget.mockResolvedValueOnce(null);
    //     (mockUserService.findByEmail as jest.Mock).mockResolvedValueOnce(null);
    //     (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashedPass');
    //     mockRedisService.hset.mockResolvedValueOnce(true);
    //     mockConfigService.get.mockReturnValueOnce(3600);
    //     jest
    //       .spyOn(service, 'generateEmailVerification')
    //       .mockRejectedValueOnce(new Error('Mail service down'));

    //     await expect(service.register(mockRegisterDto)).rejects.toThrow('Mail service down');
    //   });
    // });

    describe('sendResetPasswordEmail', () => {
        const mockUser = {
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
            mockUserService.findByEmail.mockResolvedValueOnce(mockUser);
            mockUserService.findById.mockResolvedValueOnce(mockUser);
            mockVerificationService.generateOtp.mockResolvedValueOnce('123456');
            mockBackgroundJobsService.queueOtpEmail.mockResolvedValueOnce({ success: true });

            const result = await service.sendResetPasswordEmail('test@example.com');

            expect(mockUserService.findById).toHaveBeenCalledWith('user-1');
            expect(mockVerificationService.generateOtp).toHaveBeenCalledWith('user-1', 'password');
            expect(mockBackgroundJobsService.queueOtpEmail).toHaveBeenCalledWith(expect.objectContaining({
                email: 'test@example.com',
                username: undefined, // user object doesn't have username property 
                otp: '123456',
                email_type: 'reset_password',
            }));

            expect(result).toEqual({ isEmailSent: true });
        });

        it('should throw NotFoundException if user not found', async () => {
            mockUserService.findByEmail = jest.fn().mockResolvedValue(null);

            await expect(service.sendResetPasswordEmail('missing@example.com')).rejects.toThrow(
                new NotFoundException(ERROR_MESSAGES.EMAIL_NOT_FOUND)
            );

            expect(mockVerificationService.generateOtp).not.toHaveBeenCalled();
            expect(mockBackgroundJobsService.queueOtpEmail).not.toHaveBeenCalled();
        });

        it('should throw InternalServerErrorException if email sending fails', async () => {
            mockUserService.findByEmail.mockResolvedValueOnce(mockUser);
            mockUserService.findById.mockResolvedValueOnce(mockUser);
            mockVerificationService.generateOtp.mockResolvedValueOnce('123456');
            mockBackgroundJobsService.queueOtpEmail.mockResolvedValueOnce({ success: false });

            await expect(service.sendResetPasswordEmail('test@example.com')).rejects.toThrow(
                new InternalServerErrorException(ERROR_MESSAGES.FAILED_TO_SEND_OTP_EMAIL)
            );
        });

        it('should propagate error if OTP generation fails', async () => {
            mockUserService.findByEmail.mockResolvedValueOnce(mockUser);
            mockUserService.findById.mockResolvedValueOnce(mockUser);
            mockVerificationService.generateOtp.mockRejectedValueOnce(
                new Error('OTP service down')
            );

            await expect(service.sendResetPasswordEmail('test@example.com')).rejects.toThrow(
                'OTP service down'
            );
        });
    });

    describe('verifyResetPasswordOtp', () => {
        const userEmail = 'test@example.com';
        const otpToken = '654321';
        const resetToken = 'secure-reset-token';
        const mockUser = {
            id: 'user-123',
            email: 'test@example.com',
            name: 'John',
            password: 'hashedPassword',
            phone_number: '1234567890',
        };

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should verify OTP successfully and return resetToken', async () => {
            mockUserService.findByEmail.mockResolvedValueOnce(mockUser);
            mockVerificationService.validateOtp = jest.fn().mockResolvedValueOnce(true);
            mockVerificationService.generatePasswordResetToken = jest
                .fn()
                .mockResolvedValueOnce(resetToken);

            const result = await service.verifyResetPasswordOtp(userEmail, otpToken);

            expect(mockVerificationService.validateOtp).toHaveBeenCalledWith(
                'user-123',
                otpToken,
                'password'
            );
            expect(mockVerificationService.generatePasswordResetToken).toHaveBeenCalledWith('user-123');
            expect(result).toEqual({ isValid: true, resetToken });
        });

        it('should throw UnprocessableEntityException if OTP is invalid', async () => {
            mockUserService.findByEmail.mockResolvedValueOnce(mockUser);
            mockVerificationService.validateOtp = jest.fn().mockResolvedValueOnce(false);

            await expect(service.verifyResetPasswordOtp(userEmail, otpToken)).rejects.toThrow(
                UnprocessableEntityException
            );

            expect(mockVerificationService.generatePasswordResetToken).not.toHaveBeenCalled();
        });

        it('should throw InternalServerErrorException if validateOtp throws', async () => {
            mockUserService.findByEmail.mockResolvedValueOnce(mockUser);
            mockVerificationService.validateOtp = jest
                .fn()
                .mockRejectedValueOnce(new Error('OTP error'));

            await expect(service.verifyResetPasswordOtp(userEmail, otpToken)).rejects.toThrow(
                'OTP error'
            );

            expect(mockVerificationService.generatePasswordResetToken).not.toHaveBeenCalled();
        });

        it('should throw InternalServerErrorException if generatePasswordResetToken throws', async () => {
            mockUserService.findByEmail.mockResolvedValueOnce(mockUser);
            mockVerificationService.validateOtp = jest.fn().mockResolvedValueOnce(true);
            mockVerificationService.generatePasswordResetToken = jest
                .fn()
                .mockRejectedValueOnce(new Error('Token gen failed'));

            await expect(service.verifyResetPasswordOtp(userEmail, otpToken)).rejects.toThrow(
                'Token gen failed'
            );
        });
    });

    describe('resetPassword', () => {
        const userEmail = 'test@example.com';
        const validToken = 'valid-reset-token';
        const newPassword = 'newPass123';
        const hashedNewPassword = 'hashed-new-pass';
        const existingHashedPassword = 'hashed-old-pass';
        const mockUser = {
            id: 'user-123',
            email: 'test@example.com',
            name: 'John',
            password: existingHashedPassword,
            phone_number: '1234567890',
        };

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should reset password successfully', async () => {
            const mockTokenData = { userId: 'user-123' };
            
            mockUserService.findByEmail.mockResolvedValueOnce(mockUser);
            mockUserService.findById.mockResolvedValueOnce(mockUser);
            mockVerificationService.validatePasswordResetToken.mockResolvedValueOnce(mockTokenData);
            mockUserService.findById.mockResolvedValueOnce(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
            (bcrypt.hash as jest.Mock).mockResolvedValueOnce(hashedNewPassword);
            mockUserService.updatePassword.mockResolvedValueOnce(true);

            const result = await service.resetPassword(userEmail, newPassword, validToken);

            expect(mockVerificationService.validatePasswordResetToken).toHaveBeenCalledWith(
                validToken
            );
            expect(mockUserService.findById).toHaveBeenCalledWith('user-123');
            expect(bcrypt.compare).toHaveBeenCalledWith(newPassword, existingHashedPassword);
            expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 10);
            expect(mockUserService.updatePassword).toHaveBeenCalledWith(
                'user-123',
                hashedNewPassword
            );

            expect(result).toEqual({});
        });

        it('should throw UnauthorizedException if token is invalid or expired', async () => {
            mockUserService.findByEmail.mockResolvedValueOnce({
                id: 'user-123',
                email: userEmail,
                password: 'hashed-pass',
                name: 'Test User',
                phone_number: '+1234567890'
            });
            mockVerificationService.validatePasswordResetToken.mockResolvedValueOnce(null);

            await expect(service.resetPassword(userEmail, newPassword, validToken)).rejects.toThrow(
                new UnauthorizedException(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
            );

            expect(mockUserService.findById).not.toHaveBeenCalled();
        });

        it('should throw UnauthorizedException if token userId does not match request userId', async () => {
            mockUserService.findByEmail.mockResolvedValueOnce(mockUser);
            mockVerificationService.validatePasswordResetToken.mockResolvedValueOnce({
                userId: 'another-user',
            });

            await expect(service.resetPassword(userEmail, newPassword, validToken)).rejects.toThrow(
                new UnauthorizedException(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
            );

            expect(mockUserService.findById).not.toHaveBeenCalled();
        });

        it('should throw NotFoundException if user is not found', async () => {
            mockUserService.findByEmail.mockResolvedValueOnce(mockUser);
            mockVerificationService.validatePasswordResetToken.mockResolvedValueOnce({
                userId: 'user-123',
            });
            mockUserService.findById.mockReset();
            mockUserService.findById.mockResolvedValueOnce(null);

            await expect(service.resetPassword(userEmail, newPassword, validToken)).rejects.toThrow(
                new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND)
            );

            expect(bcrypt.compare).not.toHaveBeenCalled();
        });

        it('should throw BadRequestException if new password matches current one', async () => {
            mockUserService.findByEmail.mockResolvedValueOnce(mockUser);
            mockVerificationService.validatePasswordResetToken.mockResolvedValueOnce({
                userId: 'user-123',
            });
            mockUserService.findById.mockReset();
            mockUserService.findById.mockResolvedValueOnce(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true); // same password

            await expect(service.resetPassword(userEmail, newPassword, validToken)).rejects.toThrow(
                new BadRequestException(ERROR_MESSAGES.NEW_PASSWORD_SAME_AS_OLD)
            );

            expect(mockUserService.updatePassword).not.toHaveBeenCalled();
        });

        it('should throw if updatePassword fails', async () => {
            mockUserService.findByEmail.mockResolvedValueOnce(mockUser);
            mockVerificationService.validatePasswordResetToken.mockResolvedValueOnce({
                userId: 'user-123',
            });
            mockUserService.findById.mockReset();
            mockUserService.findById.mockResolvedValueOnce(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
            (bcrypt.hash as jest.Mock).mockResolvedValueOnce(hashedNewPassword);
            mockUserService.updatePassword.mockRejectedValueOnce(new Error('DB error'));

            await expect(service.resetPassword(userEmail, newPassword, validToken)).rejects.toThrow(
                'DB error'
            );
        });
    });

    describe('handleNotMe', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should delete pending user and otp if valid token', async () => {
            const mockUser = { email: 'test@example.com' };

            mockVerificationService.validateNotMeLink.mockResolvedValue(mockUser);
            mockRedisService.hget.mockResolvedValue({ email: mockUser.email });
            mockRedisService.del.mockResolvedValue(true);

            const result = await service.handleNotMe('valid_token');

            expect(mockVerificationService.validateNotMeLink).toHaveBeenCalledWith('valid_token');
            expect(mockRedisService.hget).toHaveBeenCalledWith(`signup:session:${mockUser.email}`);
            expect(mockRedisService.del).toHaveBeenCalledTimes(2);
            expect(mockRedisService.del).toHaveBeenCalledWith(`signup:session:${mockUser.email}`);
            expect(mockRedisService.del).toHaveBeenCalledWith(`otp:email:${mockUser.email}`);
            expect(result).toEqual({});
        });

        it('should throw UnauthorizedException if token is invalid or expired', async () => {
            mockVerificationService.validateNotMeLink.mockResolvedValue(null);

            await expect(service.handleNotMe('invalid_token')).rejects.toThrow(
                UnauthorizedException
            );

            expect(mockVerificationService.validateNotMeLink).toHaveBeenCalledWith('invalid_token');
            expect(mockRedisService.hget).not.toHaveBeenCalled();
            expect(mockRedisService.del).not.toHaveBeenCalled();
        });

        it('should throw BadRequestException if account already verified', async () => {
            const mockUser = { email: 'test@example.com' };

            mockVerificationService.validateNotMeLink.mockResolvedValue(mockUser);
            mockRedisService.hget.mockResolvedValue(null);

            await expect(service.handleNotMe('expired_link')).rejects.toThrow(BadRequestException);

            expect(mockVerificationService.validateNotMeLink).toHaveBeenCalledWith('expired_link');
            expect(mockRedisService.hget).toHaveBeenCalledWith(`signup:session:${mockUser.email}`);
            expect(mockRedisService.del).not.toHaveBeenCalled();
        });
    });

    describe('changePassword', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should update password successfully when valid', async () => {
            const mockUser = { id: 'user123', password: 'hashedOldPass' };
            mockUserService.findById.mockReset();
            mockUserService.findById.mockResolvedValueOnce(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
            (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashedNewPass');

            const result = await service.changePassword('user123', 'oldPass', 'newPass');

            expect(mockUserService.findById).toHaveBeenCalledWith('user123');
            expect(bcrypt.compare).toHaveBeenCalledWith('oldPass', 'hashedOldPass');
            expect(bcrypt.hash).toHaveBeenCalledWith('newPass', 10);
            expect(mockUserService.updatePassword).toHaveBeenCalledWith(
                'user123',
                'hashedNewPass'
            );
            expect(result).toEqual({});
        });

        it('should update password even if user has no current password (OAuth user)', async () => {
            const mockUser = { id: 'user123', password: null };
            mockUserService.findById.mockReset();
            mockUserService.findById.mockResolvedValueOnce(mockUser);
            (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashedNewPass');

            const result = await service.changePassword('user123', 'oldPass', 'newPass');

            expect(bcrypt.compare).not.toHaveBeenCalled();
            expect(mockUserService.updatePassword).toHaveBeenCalledWith(
                'user123',
                'hashedNewPass'
            );
            expect(result).toEqual({});
        });

        it('should throw BadRequestException if new password equals old password', async () => {
            await expect(service.changePassword('user123', 'samePass', 'samePass')).rejects.toThrow(
                BadRequestException
            );

            expect(mockUserService.findById).not.toHaveBeenCalled();
            expect(mockUserService.updatePassword).not.toHaveBeenCalled();
        });

        it('should throw NotFoundException if user not found', async () => {
            mockUserService.findById.mockReset();
            mockUserService.findById.mockResolvedValueOnce(null);

            await expect(service.changePassword('user123', 'oldPass', 'newPass')).rejects.toThrow(
                NotFoundException
            );

            expect(mockUserService.findById).toHaveBeenCalledWith('user123');
            expect(mockUserService.updatePassword).not.toHaveBeenCalled();
        });

        it('should throw UnauthorizedException if old password is wrong', async () => {
            const mockUser = { id: 'user123', password: 'hashedOldPass' };
            mockUserService.findById.mockResolvedValue(mockUser);
            jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

            await expect(
                service.changePassword('user123', 'wrongOldPass', 'newPass')
            ).rejects.toThrow(UnauthorizedException);

            expect(bcrypt.compare).toHaveBeenCalledWith('wrongOldPass', 'hashedOldPass');
            expect(mockUserService.updatePassword).not.toHaveBeenCalled();
        });
    });

    describe('refresh', () => {
        const mockPayload = { id: 'user123', jti: 'token123' };
        const mockTokens = { accessToken: 'access', refreshToken: 'refresh' };

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should refresh tokens successfully', async () => {
            mockJwtService.verifyAsync.mockResolvedValue(mockPayload);
            mockRedisService.get.mockResolvedValue('1'); // token exists
            mockRedisService.del.mockResolvedValue(1);
            jest.spyOn(service, 'generateTokens').mockResolvedValue(mockTokens as any);

            const result = await service.refresh('valid-refresh-token');

            expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('valid-refresh-token', {
                secret: process.env.JWT_REFRESH_SECRET,
            });
            expect(mockRedisService.get).toHaveBeenCalledWith('refresh:token123');
            expect(mockRedisService.del).toHaveBeenCalledWith('refresh:token123');
            expect(service.generateTokens).toHaveBeenCalledWith('user123');
            expect(result).toEqual(mockTokens);
        });

        it('should throw UnauthorizedException if refresh token not in Redis', async () => {
            mockJwtService.verifyAsync.mockResolvedValue(mockPayload);
            mockRedisService.get.mockResolvedValue(null);

            await expect(service.refresh('invalid-refresh')).rejects.toThrow(
                new UnauthorizedException(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
            );

            expect(mockRedisService.del).not.toHaveBeenCalled();
        });

        it('should throw UnauthorizedException if JWT verification fails', async () => {
            mockJwtService.verifyAsync.mockRejectedValue(new Error('invalid jwt'));

            await expect(service.refresh('bad-token')).rejects.toThrow(
                new UnauthorizedException(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
            );

            expect(mockRedisService.get).not.toHaveBeenCalled();
        });
    });

    describe('validateGoogleUser', () => {
        const mockGoogleUser = {
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
            const existingUser = { id: '1', email: 'test@example.com' };
            mockUserService.findByGoogleId.mockResolvedValueOnce(existingUser);

            const result = await service.validateGoogleUser(mockGoogleUser);

            expect(mockUserService.findByGoogleId).toHaveBeenCalledWith('google123');
            expect(result).toEqual({
                user: existingUser,
                needs_completion: false,
            });
            expect(mockUserService.findByEmail).not.toHaveBeenCalled();
            expect(mockUserService.createUser).not.toHaveBeenCalled();
        });

        it('should update existing user with googleId if found by email', async () => {
            mockUserService.findByGoogleId.mockResolvedValueOnce(null);
            const userByEmail = { id: '2', email: 'test@example.com' };
            const updatedUser = { ...userByEmail, google_id: 'google123' };

            (mockUserService.findByEmail as jest.Mock).mockResolvedValueOnce(
                userByEmail as any
            );
            mockUserService.updateUserById.mockResolvedValueOnce(updatedUser);

            const result = await service.validateGoogleUser(mockGoogleUser);

            expect(mockUserService.findByGoogleId).toHaveBeenCalledWith('google123');
            expect(mockUserService.findByEmail).toHaveBeenCalledWith('test@example.com');
            expect(mockUserService.updateUserById).toHaveBeenCalledWith('2', {
                google_id: 'google123',
                avatar_url: 'http://avatar.com/john',
            });
            expect(result).toEqual({
                user: updatedUser,
                needs_completion: false,
            });
        });

        it('should throw if updateUser fails to return user', async () => {
            mockUserService.findByGoogleId.mockResolvedValueOnce(null);
            const userByEmail = { id: '2', email: 'test@example.com' };
            (mockUserService.findByEmail as jest.Mock).mockResolvedValueOnce(
                userByEmail as any
            );
            mockUserService.updateUserById.mockResolvedValueOnce(null);

            await expect(service.validateGoogleUser(mockGoogleUser)).rejects.toThrow(
                new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
            );
        });

        it('should create a new user if not found by googleId or email', async () => {
            mockUserService.findByGoogleId.mockResolvedValueOnce(null);
            (mockUserService.findByEmail as jest.Mock).mockResolvedValueOnce(null);

            const createdUser = { id: '3', ...mockGoogleUser };
            mockUserService.createUser.mockResolvedValueOnce(createdUser);

            const result = await service.validateGoogleUser(mockGoogleUser);

            expect(mockUserService.findByGoogleId).toHaveBeenCalledWith('google123');
            expect(mockUserService.findByEmail).toHaveBeenCalledWith('test@example.com');
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
        const mockFacebookUser = {
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
            const existingUser = { id: '1', email: 'test@example.com' };
            mockUserService.findByFacebookId.mockResolvedValueOnce(existingUser);

            const result = await service.validateFacebookUser(mockFacebookUser);

            expect(mockUserService.findByFacebookId).toHaveBeenCalledWith('fb123');
            expect(result).toEqual({
                user: existingUser,
                needs_completion: false,
            });
            expect(mockUserService.findByEmail).not.toHaveBeenCalled();
            expect(mockUserService.createUser).not.toHaveBeenCalled();
        });

        it('should update existing user with facebook_id if found by email', async () => {
            mockUserService.findByFacebookId.mockResolvedValueOnce(null);
            const userByEmail = { id: '2', email: 'test@example.com' };
            const updatedUser = { ...userByEmail, facebook_id: 'fb123' };

            (mockUserService.findByEmail as jest.Mock).mockResolvedValueOnce(userByEmail);
            mockUserService.updateUserById.mockResolvedValueOnce(updatedUser);

            const result = await service.validateFacebookUser(mockFacebookUser);

            expect(mockUserService.findByFacebookId).toHaveBeenCalledWith('fb123');
            expect(mockUserService.findByEmail).toHaveBeenCalledWith('test@example.com');
            expect(mockUserService.updateUserById).toHaveBeenCalledWith('2', {
                facebook_id: 'fb123',
                avatar_url: 'http://avatar.com/john',
            });
            expect(result).toEqual({
                user: updatedUser,
                needs_completion: false,
            });
        });

        it('should throw if updateUser fails to return user', async () => {
            mockUserService.findByFacebookId.mockResolvedValueOnce(null);
            const userByEmail = { id: '2', email: 'test@example.com' };
            (mockUserService.findByEmail as jest.Mock).mockResolvedValueOnce(userByEmail);
            mockUserService.updateUserById.mockResolvedValueOnce(null);

            await expect(service.validateFacebookUser(mockFacebookUser)).rejects.toThrow(
                new InternalServerErrorException(ERROR_MESSAGES.FAILED_TO_UPDATE_IN_DB)
            );
        });

        it('should create a new user if not found by facebook_id or email', async () => {
            mockUserService.findByFacebookId.mockResolvedValueOnce(null);
            (mockUserService.findByEmail as jest.Mock).mockResolvedValueOnce(null);

            const createdUser = { id: '3', ...mockFacebookUser };
            mockUserService.createUser.mockResolvedValueOnce(createdUser);

            const result = await service.validateFacebookUser(mockFacebookUser);

            expect(mockUserService.findByFacebookId).toHaveBeenCalledWith('fb123');
            expect(mockUserService.findByEmail).toHaveBeenCalledWith('test@example.com');
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
        const mockGitHubUser = {
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
            const existingUser = { id: '1', email: 'dev@example.com' };
            mockUserService.findByGithubId.mockResolvedValueOnce(existingUser);

            const result = await service.validateGitHubUser(mockGitHubUser);

            expect(mockUserService.findByGithubId).toHaveBeenCalledWith('gh123');
            expect(result).toEqual({
                user: existingUser,
                needs_completion: false,
            });
            expect(mockUserService.findByEmail).not.toHaveBeenCalled();
            expect(mockUserService.createUser).not.toHaveBeenCalled();
        });

        it('should update existing user with github_id if found by email', async () => {
            mockUserService.findByGithubId.mockResolvedValueOnce(null);
            const userByEmail = { id: '2', email: 'dev@example.com' };
            const updatedUser = { ...userByEmail, github_id: 'gh123' };

            (mockUserService.findByEmail as jest.Mock).mockResolvedValueOnce(userByEmail);
            mockUserService.updateUserById.mockResolvedValueOnce(updatedUser);

            const result = await service.validateGitHubUser(mockGitHubUser);

            expect(mockUserService.findByGithubId).toHaveBeenCalledWith('gh123');
            expect(mockUserService.findByEmail).toHaveBeenCalledWith('dev@example.com');
            expect(mockUserService.updateUserById).toHaveBeenCalledWith('2', {
                github_id: 'gh123',
                avatar_url: 'http://avatar.com/dev',
            });
            expect(result).toEqual({
                user: updatedUser,
                needs_completion: false,
            });
        });

        it('should throw if updateUser fails to return user', async () => {
            mockUserService.findByGithubId.mockResolvedValueOnce(null);
            const userByEmail = { id: '2', email: 'dev@example.com' };
            (mockUserService.findByEmail as jest.Mock).mockResolvedValueOnce(userByEmail);
            mockUserService.updateUserById.mockResolvedValueOnce(null);

            await expect(service.validateGitHubUser(mockGitHubUser)).rejects.toThrow(
                new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
            );
        });

        it('should create a new user if not found by github_id or email', async () => {
            mockUserService.findByGithubId.mockResolvedValueOnce(null);
            (mockUserService.findByEmail as jest.Mock).mockResolvedValueOnce(null);

            const createdUser = { id: '3', ...mockGitHubUser };
            mockUserService.createUser.mockResolvedValueOnce(createdUser);

            const result = await service.validateGitHubUser(mockGitHubUser);

            expect(mockUserService.findByGithubId).toHaveBeenCalledWith('gh123');
            expect(mockUserService.findByEmail).toHaveBeenCalledWith('dev@example.com');
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

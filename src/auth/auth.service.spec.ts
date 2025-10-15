
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
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcrypt';
import { RedisService } from 'src/redis/redis.service';
import { JwtService } from '@nestjs/jwt';
import { VerificationService } from 'src/verification/verification.service';
import { EmailService } from 'src/message/email.service';
import { CaptchaService } from './captcha.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ConflictException, InternalServerErrorException, NotFoundException, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';



describe('AuthService', () => {
    let service: AuthService;

  const mockUserService = {
      findUserByEmail: jest.fn(async (email: string) => {
        return {
          id: '1',
          email,
          password: 'hashedPassword',
          firstName: 'Test',
          lastName: 'User',
          phoneNumber: '1234567890',
        };
      }),
      findUserById: jest.fn(),
      findUserByGoogleId: jest.fn(),
      findUserByFacebookId: jest.fn(),
      findUserByGithubId: jest.fn(),
      createUser: jest.fn(),
      updateUserPassword: jest.fn(),
      updateUser: jest.fn(),
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
        { provide: UserService, useValue: mockUserService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: VerificationService, useValue: mockVerificationService },
        { provide: EmailService, useValue: mockEmailService },
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
      const id = await service.validateUser('test@example.com', 'password');
      expect(id).toBe('1');
    });

    it('should throw "Wrong password" when password is incorrect', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
      await expect(service.validateUser('test@example.com', 'wrongpassword'))
        .rejects.toThrow('Wrong password');
    });

    it('should throw "User not found" when user does not exist', async () => {
      (mockUserService.findUserByEmail as jest.Mock).mockResolvedValueOnce(null);
      await expect(service.validateUser('missing@example.com', 'password'))
        .rejects.toThrow('User not found');
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
        }),
      );
      expect(mockJwtService.sign).toHaveBeenNthCalledWith(
        2,
        { id: 'user-1', jti: mockJti },
        expect.objectContaining({
          secret: process.env.JWT_REFRESH_SECRET,
          expiresIn: process.env.JWT_REFRESH_EXPIRATION_TIME,
        }),
      );

      // Verify Redis interactions
      expect(mockRedisService.set).toHaveBeenCalledWith(
        `refresh:${mockJti}`,
        JSON.stringify({ id: 'user-1' }),
        7 * 24 * 60 * 60,
      );
      expect(mockRedisService.sadd).toHaveBeenCalledWith(
        `user:user-1:refreshTokens`,
        mockJti,
      );
      expect(mockRedisService.expire).toHaveBeenCalledWith(
        `user:user-1:refreshTokens`,
        7 * 24 * 60 * 60,
      );
    });

    it('should throw if jwtService.sign throws an error', async () => {
      //used mockImplementationOnce for sync error throwing
      mockJwtService.sign.mockImplementationOnce(() => { throw new Error('JWT error'); });

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
      firstName: 'Test',
      lastName: 'User',
      phoneNumber: '1234567890',
    };
    // Set up findUserById to return mockUser when called with 'user-1'
    (mockUserService.findUserById as jest.Mock).mockResolvedValueOnce(mockUser);
    //mock the methods used inside login()
    jest.spyOn(service, 'generateTokens').mockResolvedValue(mockTokens);
    jest.spyOn(service, 'validateUser').mockResolvedValue('user-1');

    const result = await service.login({email:'test@example.com',password: 'password'});

    expect(service.validateUser).toHaveBeenCalledWith('test@example.com', 'password');

    expect(service.generateTokens).toHaveBeenCalledWith('user-1');

    expect(result).toEqual({
      user: mockUser,
      ...mockTokens,
     });
    });
    it('should throw if validateUser throws', async () => {
      jest.spyOn(service, 'validateUser').mockRejectedValue(new Error('some random failure'));

      await expect(
        service.login({ email: 'test@example.com', password: 'password' })
      ).rejects.toThrow(); 
    });

    it('should throw if findUserById returns null', async () => {
      jest.spyOn(service, 'validateUser').mockResolvedValue('user-1');
      (mockUserService.findUserById as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        service.login({ email: 'test@example.com', password: 'password' })
      ).rejects.toThrow('User not found');
    });

    it('should throw if generateTokens throws', async () => {
      jest.spyOn(service, 'validateUser').mockResolvedValue('user-1');
      (mockUserService.findUserById as jest.Mock).mockResolvedValueOnce({
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phoneNumber: '1234567890',
      });
      jest.spyOn(service, 'generateTokens').mockRejectedValue(new Error('token error'));

      await expect(
        service.login({ email: 'test@example.com', password: 'password' })
      ).rejects.toThrow();
    });

    // it('should throw if redisService.sadd throws', async () => {
    //   jest.spyOn(service, 'validateUser').mockResolvedValue('user-1');
    //   (mockUserService.findUserById as jest.Mock).mockResolvedValueOnce({
    //     id: 'user-1',
    //     email: 'test@example.com',
    //     firstName: 'Test',
    //     lastName: 'User',
    //     phoneNumber: '1234567890',
    //   });
    //   jest.spyOn(service, 'generateTokens').mockResolvedValue({
    //     access_token: 'access',
    //     refresh_token: 'refresh',
    //   });
    //   mockRedisService.sadd.mockRejectedValueOnce(new Error('Redis error'));

    //   await expect(
    //     service.login({ email: 'test@example.com', password: 'password' })
    //   ).rejects.toThrow('Redis error');
    //   });

    // it('should throw if redisService.expire throws', async () => {
    //   jest.spyOn(service, 'validateUser').mockResolvedValue('user-1');
    //   (mockUserService.findUserById as jest.Mock).mockResolvedValueOnce({
    //     id: 'user-1',
    //     email: 'test@example.com',
    //     firstName: 'Test',
    //     lastName: 'User',
    //     phoneNumber: '1234567890',
    //   });
    //   jest.spyOn(service, 'generateTokens').mockResolvedValue({
    //     access_token: 'access',
    //     refresh_token: 'refresh',
    //   });
    //   mockRedisService.expire.mockRejectedValueOnce(new Error('Redis error'));

    //   await expect(
    //     service.login({ email: 'test@example.com', password: 'password' })
    //   ).rejects.toThrow('Redis error');
    // });

    // it('should throw if redisService.srem throws', async () => {
    //   jest.spyOn(service, 'validateUser').mockResolvedValue('user-1');
    //   (mockUserService.findUserById as jest.Mock).mockResolvedValueOnce({
    //     id: 'user-1',
    //     email: 'test@example.com',
    //     firstName: 'Test',
    //     lastName: 'User',
    //     phoneNumber: '1234567890',
    //   });
    //   jest.spyOn(service, 'generateTokens').mockResolvedValue({
    //     access_token: 'access',
    //     refresh_token: 'refresh',
    //   });
    //   mockRedisService.srem.mockRejectedValueOnce(new Error('Redis error'));

    //   await expect(
    //     service.login({ email: 'test@example.com', password: 'password' })
    //   ).rejects.toThrow('Redis error');
    // });

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

      const result = await service.logout('valid-refresh-token', mockRes as any);

      // verify jwt call
      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('valid-refresh-token', {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      // verify redis cleanup
      expect(mockRedisService.del).toHaveBeenCalledWith(`refresh:${mockPayload.jti}`);
      expect(mockRedisService.srem).toHaveBeenCalledWith(
        `user:${mockPayload.id}:refreshTokens`,
        mockPayload.jti,
      );

      // verify cookie cleared
      expect(mockRes.clearCookie).toHaveBeenCalledWith('refresh_token', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
      });

      expect(result).toEqual({ message: 'Logged out successfully' });
    });

    it('should throw UnauthorizedException if token is invalid', async () => {
      mockJwtService.verifyAsync.mockRejectedValueOnce(new Error('Invalid token'));

      await expect(service.logout('invalid-token', mockRes as any)).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );

      expect(mockRedisService.del).not.toHaveBeenCalled();
      expect(mockRedisService.srem).not.toHaveBeenCalled();
      expect(mockRes.clearCookie).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if redis throws an error', async () => {
      const mockPayload = { id: 'user-1', jti: 'jti-123' };
      mockJwtService.verifyAsync.mockResolvedValueOnce(mockPayload);
      mockRedisService.del.mockRejectedValueOnce(new Error('Redis down'));

      await expect(service.logout('valid-refresh-token', mockRes as any)).rejects.toThrow();

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

      const result = await service.logoutAll('valid-refresh-token', mockRes as any);

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

      expect(result).toEqual({ message: 'Logged out from all devices' });
    });

    it('should do nothing with Redis if user has no refresh tokens', async () => {
      const mockPayload = { id: 'user-1', jti: 'jti-123' };

      mockJwtService.verifyAsync.mockResolvedValueOnce(mockPayload);
      mockRedisService.smembers = jest.fn().mockResolvedValueOnce([]);
      mockRedisService.pipeline = jest.fn();

      const result = await service.logoutAll('valid-refresh-token', mockRes as any);

      expect(mockRedisService.pipeline).not.toHaveBeenCalled();
      expect(mockRes.clearCookie).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Logged out from all devices' });
    });

    it('should throw UnauthorizedException if token is invalid', async () => {
      mockJwtService.verifyAsync.mockRejectedValueOnce(new Error('Invalid token'));

      await expect(service.logoutAll('invalid-token', mockRes as any)).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
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
    const mockUser = { firstName: 'John', lastName: 'Doe' };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should send verification email successfully', async () => {
      // Mock user in Redis
      mockRedisService.hget = jest.fn().mockResolvedValueOnce(mockUser);
      mockVerificationService.generateOtp = jest.fn().mockResolvedValueOnce('123456');
      mockVerificationService.generateNotMeLink = jest.fn().mockResolvedValueOnce('https://notme.link');
      mockEmailService.sendEmail = jest.fn().mockResolvedValueOnce(true);

      const result = await service.generateEmailVerification('test@example.com');

      expect(mockRedisService.hget).toHaveBeenCalledWith('user:test@example.com');
      expect(mockVerificationService.generateOtp).toHaveBeenCalledWith('test@example.com', 'email');
      expect(mockVerificationService.generateNotMeLink).toHaveBeenCalled();
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'El Sab3 - Account Verification',
          recipients: [{ name: 'John', address: 'test@example.com' }],
          html: expect.stringContaining('123456'),
        }),
      );

      expect(result).toEqual({ isEmailSent: true });
    });

    it('should throw NotFoundException if user not in Redis', async () => {
      mockRedisService.hget = jest.fn().mockResolvedValueOnce(null);

      await expect(service.generateEmailVerification('missing@example.com')).rejects.toThrow(
        new NotFoundException('User not found or already verified'),
      );

      expect(mockVerificationService.generateOtp).not.toHaveBeenCalled();
      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if emailService.sendEmail fails', async () => {
      mockRedisService.hget = jest.fn().mockResolvedValueOnce(mockUser);
      mockVerificationService.generateOtp = jest.fn().mockResolvedValueOnce('123456');
      mockVerificationService.generateNotMeLink = jest.fn().mockResolvedValueOnce('https://notme.link');
      mockEmailService.sendEmail = jest.fn().mockResolvedValueOnce(false);

      await expect(service.generateEmailVerification('test@example.com')).rejects.toThrow(
        new InternalServerErrorException('Failed to send OTP email'),
      );
    });
  });

  describe('register', () => {
    const mockRegisterDto:RegisterDto = {
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      captchaToken: 'valid-captcha',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '1234567890',
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should register successfully and send verification email', async () => {
      mockCaptchaService.validateCaptcha.mockResolvedValueOnce(true);
      mockRedisService.hget.mockResolvedValueOnce(null);
      (mockUserService.findUserByEmail as jest.Mock).mockResolvedValueOnce(null);
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashedPass');
      mockRedisService.hset.mockResolvedValueOnce(true);
      mockConfigService.get.mockReturnValueOnce(3600);
      jest.spyOn(service, 'generateEmailVerification').mockResolvedValueOnce({ isEmailSent: true });

      const result = await service.register(mockRegisterDto);

      expect(mockCaptchaService.validateCaptcha).toHaveBeenCalledWith('valid-captcha');
      expect(mockRedisService.hget).toHaveBeenCalledWith('user:test@example.com');
      expect(mockUserService.findUserByEmail).toHaveBeenCalledWith('test@example.com');
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockRedisService.hset).toHaveBeenCalledWith(
        'user:test@example.com',
        expect.objectContaining({
          firstName: 'John',
          lastName: 'Doe',
          password: 'hashedPass',
        }),
        3600,
      );
      expect(service.generateEmailVerification).toHaveBeenCalledWith('test@example.com');
      expect(result).toEqual({ isEmailSent: true });
    });

    it('should throw BadRequestException if CAPTCHA fails', async () => {
      mockCaptchaService.validateCaptcha.mockRejectedValueOnce(new Error('Invalid captcha'));

      await expect(service.register(mockRegisterDto)).rejects.toThrow(
        new BadRequestException('CAPTCHA verification failed. Please try again.'),
      );

      expect(mockRedisService.hget).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if email is pending in Redis', async () => {
      mockCaptchaService.validateCaptcha.mockResolvedValueOnce(true);
      mockRedisService.hget.mockResolvedValueOnce({ some: 'pendingUser' });

      await expect(service.register(mockRegisterDto)).rejects.toThrow(
        new ConflictException('Email already exists'),
      );

      expect(mockUserService.findUserByEmail).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists in DB', async () => {
      mockCaptchaService.validateCaptcha.mockResolvedValueOnce(true);
      mockRedisService.hget.mockResolvedValueOnce(null);
      (mockUserService.findUserByEmail as jest.Mock).mockResolvedValueOnce({ id: '1' });

      await expect(service.register(mockRegisterDto)).rejects.toThrow(
        new ConflictException('Email already exists'),
      );

      expect(bcrypt.hash).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if passwords do not match', async () => {
      mockCaptchaService.validateCaptcha.mockResolvedValueOnce(true);
      mockRedisService.hget.mockResolvedValueOnce(null);
      (mockUserService.findUserByEmail as jest.Mock).mockResolvedValueOnce(null);

      const badDto = { ...mockRegisterDto, confirmPassword: 'wrong' };

      await expect(service.register(badDto)).rejects.toThrow(
        new BadRequestException('Confirmation password must match password'),
      );

      expect(bcrypt.hash).not.toHaveBeenCalled();
    });

    it('should propagate error if generateEmailVerification fails', async () => {
      mockCaptchaService.validateCaptcha.mockResolvedValueOnce(true);
      mockRedisService.hget.mockResolvedValueOnce(null);
      (mockUserService.findUserByEmail as jest.Mock).mockResolvedValueOnce(null);
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashedPass');
      mockRedisService.hset.mockResolvedValueOnce(true);
      mockConfigService.get.mockReturnValueOnce(3600);
      jest
        .spyOn(service, 'generateEmailVerification')
        .mockRejectedValueOnce(new Error('Mail service down'));

      await expect(service.register(mockRegisterDto)).rejects.toThrow('Mail service down');
    });
  });

  describe('sendResetPasswordEmail', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      firstName: 'John',
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should send password reset email successfully', async () => {
      mockUserService.findUserById.mockResolvedValueOnce(mockUser);
      mockVerificationService.generateOtp.mockResolvedValueOnce('123456');
      mockEmailService.sendEmail.mockResolvedValueOnce(true);

      const result = await service.sendResetPasswordEmail('user-1');

      expect(mockUserService.findUserById).toHaveBeenCalledWith('user-1');
      expect(mockVerificationService.generateOtp).toHaveBeenCalledWith('user-1', 'password');
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Password reset request',
          recipients: [{ name: 'John', address: 'test@example.com' }],
          html: expect.stringContaining('123456'),
        }),
      );

      expect(result).toEqual({ isEmailSent: true });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserService.findUserById.mockResolvedValueOnce(null);

      await expect(service.sendResetPasswordEmail('missing-id')).rejects.toThrow(
        new NotFoundException('User not found'),
      );

      expect(mockVerificationService.generateOtp).not.toHaveBeenCalled();
      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if email sending fails', async () => {
      mockUserService.findUserById.mockResolvedValueOnce(mockUser);
      mockVerificationService.generateOtp.mockResolvedValueOnce('123456');
      mockEmailService.sendEmail.mockResolvedValueOnce(false);

      await expect(service.sendResetPasswordEmail('user-1')).rejects.toThrow(
        new InternalServerErrorException('Failed to send password reset email'),
      );
    });

    it('should propagate error if OTP generation fails', async () => {
      mockUserService.findUserById.mockResolvedValueOnce(mockUser);
      mockVerificationService.generateOtp.mockRejectedValueOnce(new Error('OTP service down'));

      await expect(service.sendResetPasswordEmail('user-1')).rejects.toThrow('OTP service down');

      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    });
  });


  describe('verifyEmail', () => {
    const email = 'test@example.com';
    const token = '123456';
    const mockUserData = { firstName: 'John', lastName: 'Doe', password: 'hashedPass' };
    const mockCreatedUser = { id: 'user-1' };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should verify email successfully and return userId', async () => {
      mockRedisService.hget.mockResolvedValueOnce(mockUserData);
      mockVerificationService.validateOtp = jest.fn().mockResolvedValueOnce(true);
      mockUserService.createUser = jest.fn().mockResolvedValueOnce(mockCreatedUser);
      mockRedisService.del.mockResolvedValueOnce(1);

      const result = await service.verifyEmail(email, token);

      expect(mockRedisService.hget).toHaveBeenCalledWith(`user:${email}`);
      expect(mockVerificationService.validateOtp).toHaveBeenCalledWith(email, token, 'email');
      expect(mockUserService.createUser).toHaveBeenCalledWith({
        email,
        ...mockUserData,
      });
      expect(mockRedisService.del).toHaveBeenCalledWith(`user:${email}`);
      expect(result).toEqual({ userId: 'user-1' });
    });

    it('should throw NotFoundException if user not found in Redis', async () => {
      mockRedisService.hget.mockResolvedValueOnce(null);

      await expect(service.verifyEmail(email, token)).rejects.toThrow(new NotFoundException("User not found or already verified"));

      expect(mockVerificationService.validateOtp).not.toHaveBeenCalled();
      expect(mockUserService.createUser).not.toHaveBeenCalled();
    });

    it('should throw UnprocessableEntityException if OTP is invalid', async () => {
      mockRedisService.hget.mockResolvedValueOnce(mockUserData);
      mockVerificationService.validateOtp = jest.fn().mockResolvedValueOnce(false);

      await expect(service.verifyEmail(email, token)).rejects.toThrow(new UnprocessableEntityException('Expired or incorrect token'));

      expect(mockUserService.createUser).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if user creation fails', async () => {
      mockRedisService.hget.mockResolvedValueOnce(mockUserData);
      mockVerificationService.validateOtp = jest.fn().mockResolvedValueOnce(true);
      mockUserService.createUser = jest.fn().mockResolvedValueOnce(null);

      await expect(service.verifyEmail(email, token)).rejects.toThrow(
        InternalServerErrorException,
      );

      expect(mockRedisService.del).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if hget throws error', async () => {
      mockRedisService.hget.mockRejectedValueOnce(new Error('Redis failure'));

      await expect(service.verifyEmail(email, token)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(mockVerificationService.validateOtp).not.toHaveBeenCalled();
      expect(mockUserService.createUser).not.toHaveBeenCalled();
      expect(mockRedisService.del).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if createUser throws error', async () => {
      mockRedisService.hget.mockResolvedValueOnce(mockUserData);
      mockVerificationService.validateOtp = jest.fn().mockResolvedValueOnce(true);
      mockUserService.createUser = jest.fn().mockRejectedValueOnce(new Error('DB error'));

      await expect(service.verifyEmail(email, token)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(mockRedisService.del).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if validateOtp throws error', async () => {
      mockRedisService.hget.mockResolvedValueOnce(mockUserData);
      mockVerificationService.validateOtp = jest.fn().mockRejectedValueOnce(new Error('OTP error'));

      await expect(service.verifyEmail(email, token)).rejects.toThrow(
        InternalServerErrorException,
      );

      expect(mockUserService.createUser).not.toHaveBeenCalled();
      expect(mockRedisService.del).not.toHaveBeenCalled();
    });
  });


  describe('verifyResetPasswordOtp', () => {
    const userId = 'user-123';
    const otpToken = '654321';
    const resetToken = 'secure-reset-token';

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should verify OTP successfully and return resetToken', async () => {
      mockVerificationService.validateOtp = jest.fn().mockResolvedValueOnce(true);
      mockVerificationService.generatePasswordResetToken = jest
        .fn()
        .mockResolvedValueOnce(resetToken);

      const result = await service.verifyResetPasswordOtp(userId, otpToken);

      expect(mockVerificationService.validateOtp).toHaveBeenCalledWith(
        userId,
        otpToken,
        'password',
      );
      expect(mockVerificationService.generatePasswordResetToken).toHaveBeenCalledWith(
        userId,
      );
      expect(result).toEqual({ isValid: true, resetToken });
    });

    it('should throw UnprocessableEntityException if OTP is invalid', async () => {
      mockVerificationService.validateOtp = jest.fn().mockResolvedValueOnce(false);

      await expect(
        service.verifyResetPasswordOtp(userId, otpToken),
      ).rejects.toThrow(UnprocessableEntityException);

      expect(mockVerificationService.generatePasswordResetToken).not.toHaveBeenCalled();


    });

    it('should throw InternalServerErrorException if validateOtp throws', async () => {
      mockVerificationService.validateOtp = jest
        .fn()
        .mockRejectedValueOnce(new Error('OTP error'));

      await expect(
        service.verifyResetPasswordOtp(userId, otpToken),
      ).rejects.toThrow(InternalServerErrorException);

      expect(mockVerificationService.generatePasswordResetToken).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if generatePasswordResetToken throws', async () => {
      mockVerificationService.validateOtp = jest.fn().mockResolvedValueOnce(true);
      mockVerificationService.generatePasswordResetToken = jest
        .fn()
        .mockRejectedValueOnce(new Error('Token gen failed'));

      await expect(
        service.verifyResetPasswordOtp(userId, otpToken),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });


  describe('resetPassword', () => {
    const userId = 'user-123';
    const validToken = 'valid-reset-token';
    const newPassword = 'newPass123';
    const hashedNewPassword = 'hashed-new-pass';
    const existingHashedPassword = 'hashed-old-pass';

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should reset password successfully', async () => {
      const mockTokenData = { userId };
      const mockUser = { id: userId, password: existingHashedPassword };

      mockVerificationService.validatePasswordResetToken.mockResolvedValueOnce(
        mockTokenData,
      );
      mockUserService.findUserById.mockResolvedValueOnce(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce(hashedNewPassword);
      mockUserService.updateUserPassword.mockResolvedValueOnce(true);

      const result = await service.resetPassword(userId, newPassword, validToken);

      expect(
        mockVerificationService.validatePasswordResetToken,
      ).toHaveBeenCalledWith(validToken);
      expect(mockUserService.findUserById).toHaveBeenCalledWith(userId);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        newPassword,
        existingHashedPassword,
      );
      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 10);
      expect(mockUserService.updateUserPassword).toHaveBeenCalledWith(
        userId,
        hashedNewPassword,
      );

      expect(result).toEqual({ success: true });
    });

    it('should throw UnauthorizedException if token is invalid or expired', async () => {
      mockVerificationService.validatePasswordResetToken.mockResolvedValueOnce(
        null,
      );

      await expect(
        service.resetPassword(userId, newPassword, validToken),
      ).rejects.toThrow(new UnauthorizedException('Invalid or expired reset token'));

      expect(mockUserService.findUserById).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if token userId does not match request userId', async () => {
      mockVerificationService.validatePasswordResetToken.mockResolvedValueOnce({
        userId: 'another-user',
      });

      await expect(
        service.resetPassword(userId, newPassword, validToken),
      ).rejects.toThrow(
        new UnauthorizedException('Invalid reset token for this user'),
      );

      expect(mockUserService.findUserById).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if user is not found', async () => {
      mockVerificationService.validatePasswordResetToken.mockResolvedValueOnce({
        userId,
      });
      mockUserService.findUserById.mockResolvedValueOnce(null);

      await expect(
        service.resetPassword(userId, newPassword, validToken),
      ).rejects.toThrow(new NotFoundException('User not found'));

      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if new password matches current one', async () => {
      const mockUser = { id: userId, password: existingHashedPassword };

      mockVerificationService.validatePasswordResetToken.mockResolvedValueOnce({
        userId,
      });
      mockUserService.findUserById.mockResolvedValueOnce(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true); // same password

      await expect(
        service.resetPassword(userId, newPassword, validToken),
      ).rejects.toThrow(
        new BadRequestException(
          'New password must be different from the current password',
        ),
      );

      expect(mockUserService.updateUserPassword).not.toHaveBeenCalled();
    });

    it('should throw if updateUserPassword fails', async () => {
      const mockUser = { id: userId, password: existingHashedPassword };

      mockVerificationService.validatePasswordResetToken.mockResolvedValueOnce({
        userId,
      });
      mockUserService.findUserById.mockResolvedValueOnce(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce(hashedNewPassword);
      mockUserService.updateUserPassword.mockRejectedValueOnce(
        new Error('DB error'),
      );

      await expect(
        service.resetPassword(userId, newPassword, validToken),
      ).rejects.toThrow('DB error');
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
      expect(mockRedisService.hget).toHaveBeenCalledWith(`user:${mockUser.email}`);
      expect(mockRedisService.del).toHaveBeenCalledTimes(2);
      expect(mockRedisService.del).toHaveBeenCalledWith(`user:${mockUser.email}`);
      expect(mockRedisService.del).toHaveBeenCalledWith(`otp:email:${mockUser.email}`);
      expect(result).toEqual({ message: 'deleted account successfully' });
    });

    it('should throw UnauthorizedException if token is invalid or expired', async () => {
      mockVerificationService.validateNotMeLink.mockResolvedValue(null);

      await expect(service.handleNotMe('invalid_token')).rejects.toThrow(UnauthorizedException);

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
      expect(mockRedisService.hget).toHaveBeenCalledWith(`user:${mockUser.email}`);
      expect(mockRedisService.del).not.toHaveBeenCalled();
    });
  });


  describe('changePassword', () => {

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should update password successfully when valid', async () => {
      const mockUser = { id: 'user123', password: 'hashedOldPass' };
      mockUserService.findUserById.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedNewPass' as never);
    
      const result = await service.changePassword('user123', 'oldPass', 'newPass');
    
      expect(mockUserService.findUserById).toHaveBeenCalledWith('user123');
      expect(bcrypt.compare).toHaveBeenCalledWith('oldPass', 'hashedOldPass');
      expect(bcrypt.hash).toHaveBeenCalledWith('newPass', 10);
      expect(mockUserService.updateUserPassword).toHaveBeenCalledWith('user123', 'hashedNewPass');
      expect(result).toEqual({ success: true });
    });
  
    it('should update password even if user has no current password (OAuth user)', async () => {
      const mockUser = { id: 'user123', password: null };
      mockUserService.findUserById.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedNewPass' as never);
    
      const result = await service.changePassword('user123', 'oldPass', 'newPass');
    
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(mockUserService.updateUserPassword).toHaveBeenCalledWith('user123', 'hashedNewPass');
      expect(result).toEqual({ success: true });
    });


    it('should throw BadRequestException if new password equals old password', async () => {
      await expect(
        service.changePassword('user123', 'samePass', 'samePass'),
      ).rejects.toThrow(BadRequestException);
    
      expect(mockUserService.findUserById).not.toHaveBeenCalled();
      expect(mockUserService.updateUserPassword).not.toHaveBeenCalled();
    });
  
    it('should throw NotFoundException if user not found', async () => {
      mockUserService.findUserById.mockResolvedValue(null);
    
      await expect(
        service.changePassword('user123', 'oldPass', 'newPass'),
      ).rejects.toThrow(NotFoundException);
    
      expect(mockUserService.findUserById).toHaveBeenCalledWith('user123');
      expect(mockUserService.updateUserPassword).not.toHaveBeenCalled();
    });
  
    it('should throw UnauthorizedException if old password is wrong', async () => {
      const mockUser = { id: 'user123', password: 'hashedOldPass' };
      mockUserService.findUserById.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);
    
      await expect(
        service.changePassword('user123', 'wrongOldPass', 'newPass'),
      ).rejects.toThrow(UnauthorizedException);
    
      expect(bcrypt.compare).toHaveBeenCalledWith('wrongOldPass', 'hashedOldPass');
      expect(mockUserService.updateUserPassword).not.toHaveBeenCalled();
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
        new UnauthorizedException('Refresh token is invalid or expired'),
      );

      expect(mockRedisService.del).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if JWT verification fails', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('invalid jwt'));

      await expect(service.refresh('bad-token')).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );

      expect(mockRedisService.get).not.toHaveBeenCalled();
    });
  });

  
  describe('validateGoogleUser', () => {
    const mockGoogleUser = {
      googleId: 'google123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      avatarUrl: 'http://avatar.com/john',
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return user if found by googleId', async () => {
      const existingUser = { id: '1', email: 'test@example.com' };
      mockUserService.findUserByGoogleId.mockResolvedValueOnce(existingUser);

      const result = await service.validateGoogleUser(mockGoogleUser);

      expect(mockUserService.findUserByGoogleId).toHaveBeenCalledWith('google123');
      expect(result).toBe(existingUser);
      expect(mockUserService.findUserByEmail).not.toHaveBeenCalled();
      expect(mockUserService.createUser).not.toHaveBeenCalled();
    });

    it('should update existing user with googleId if found by email', async () => {
      mockUserService.findUserByGoogleId.mockResolvedValueOnce(null);
      const userByEmail = { id: '2', email: 'test@example.com' };
      const updatedUser = { ...userByEmail, googleId: 'google123' };

      (mockUserService.findUserByEmail as jest.Mock).mockResolvedValueOnce(userByEmail as any);
      mockUserService.updateUser.mockResolvedValueOnce(updatedUser);

      const result = await service.validateGoogleUser(mockGoogleUser);

      expect(mockUserService.findUserByGoogleId).toHaveBeenCalledWith('google123');
      expect(mockUserService.findUserByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockUserService.updateUser).toHaveBeenCalledWith('2', {
        googleId: 'google123',
        avatarUrl: 'http://avatar.com/john',
      });
      expect(result).toEqual(updatedUser);
    });

    it('should throw if updateUser fails to return user', async () => {
      mockUserService.findUserByGoogleId.mockResolvedValueOnce(null);
      const userByEmail = { id: '2', email: 'test@example.com' };
      (mockUserService.findUserByEmail as jest.Mock).mockResolvedValueOnce(userByEmail as any);
      mockUserService.updateUser.mockResolvedValueOnce(null);

      await expect(service.validateGoogleUser(mockGoogleUser)).rejects.toThrow(
        new InternalServerErrorException('Failed to update user'),
      );
    });

    it('should create a new user if not found by googleId or email', async () => {
      mockUserService.findUserByGoogleId.mockResolvedValueOnce(null);
      (mockUserService.findUserByEmail as jest.Mock).mockResolvedValueOnce(null);

      const createdUser = { id: '3', ...mockGoogleUser };
      mockUserService.createUser.mockResolvedValueOnce(createdUser);

      const result = await service.validateGoogleUser(mockGoogleUser);

      expect(mockUserService.findUserByGoogleId).toHaveBeenCalledWith('google123');
      expect(mockUserService.findUserByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockUserService.createUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: 'http://avatar.com/john',
        googleId: 'google123',
        password: '',
        phoneNumber: '',
      });
      expect(result).toEqual(createdUser);
    });
  });



  describe('validateFacebookUser', () => {
    const mockFacebookUser = {
      facebookId: 'fb123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      avatarUrl: 'http://avatar.com/john',
    };
  
    beforeEach(() => {
      jest.clearAllMocks();
    });
  
    it('should return user if found by facebookId', async () => {
      const existingUser = { id: '1', email: 'test@example.com' };
      mockUserService.findUserByFacebookId.mockResolvedValueOnce(existingUser);
    
      const result = await service.validateFacebookUser(mockFacebookUser);
    
      expect(mockUserService.findUserByFacebookId).toHaveBeenCalledWith('fb123');
      expect(result).toBe(existingUser);
      expect(mockUserService.findUserByEmail).not.toHaveBeenCalled();
      expect(mockUserService.createUser).not.toHaveBeenCalled();
    });
  
    it('should update existing user with facebookId if found by email', async () => {
      mockUserService.findUserByFacebookId.mockResolvedValueOnce(null);
      const userByEmail = { id: '2', email: 'test@example.com' };
      const updatedUser = { ...userByEmail, facebookId: 'fb123' };
    
      (mockUserService.findUserByEmail as jest.Mock).mockResolvedValueOnce(userByEmail);
      mockUserService.updateUser.mockResolvedValueOnce(updatedUser);
    
      const result = await service.validateFacebookUser(mockFacebookUser);
    
      expect(mockUserService.findUserByFacebookId).toHaveBeenCalledWith('fb123');
      expect(mockUserService.findUserByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockUserService.updateUser).toHaveBeenCalledWith('2', {
        facebookId: 'fb123',
        avatarUrl: 'http://avatar.com/john',
      });
      expect(result).toEqual(updatedUser);
    });
  
    it('should throw if updateUser fails to return user', async () => {
      mockUserService.findUserByFacebookId.mockResolvedValueOnce(null);
      const userByEmail = { id: '2', email: 'test@example.com' };
      (mockUserService.findUserByEmail as jest.Mock).mockResolvedValueOnce(userByEmail);
      mockUserService.updateUser.mockResolvedValueOnce(null);
    
      await expect(service.validateFacebookUser(mockFacebookUser)).rejects.toThrow(
        new InternalServerErrorException('Failed to update user'),
      );
    });
  
    it('should create a new user if not found by facebookId or email', async () => {
      mockUserService.findUserByFacebookId.mockResolvedValueOnce(null);
      (mockUserService.findUserByEmail as jest.Mock).mockResolvedValueOnce(null);

      const createdUser = { id: '3', ...mockFacebookUser };
      mockUserService.createUser.mockResolvedValueOnce(createdUser);
    
      const result = await service.validateFacebookUser(mockFacebookUser);
    
      expect(mockUserService.findUserByFacebookId).toHaveBeenCalledWith('fb123');
      expect(mockUserService.findUserByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockUserService.createUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        facebookId: 'fb123',
        avatarUrl: 'http://avatar.com/john',
        phoneNumber: '',
        password: '',
      });
      expect(result).toEqual(createdUser);
    });
  });

  describe('findOrCreateGitHubUser', () => {
    const mockGitHubUser = {
      githubId: 'gh123',
      email: 'dev@example.com',
      firstName: 'Dev',
      lastName: 'Coder',
      avatarUrl: 'http://avatar.com/dev',
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return user if found by githubId', async () => {
      const existingUser = { id: '1', email: 'dev@example.com' };
      mockUserService.findUserByGithubId.mockResolvedValueOnce(existingUser);

      const result = await service.findOrCreateGitHubUser(mockGitHubUser);

      expect(mockUserService.findUserByGithubId).toHaveBeenCalledWith('gh123');
      expect(result).toBe(existingUser);
      expect(mockUserService.findUserByEmail).not.toHaveBeenCalled();
      expect(mockUserService.createUser).not.toHaveBeenCalled();
    });

    it('should update existing user with githubId if found by email', async () => {
      mockUserService.findUserByGithubId.mockResolvedValueOnce(null);
      const userByEmail = { id: '2', email: 'dev@example.com' };
      const updatedUser = { ...userByEmail, githubId: 'gh123' };

      (mockUserService.findUserByEmail as jest.Mock).mockResolvedValueOnce(userByEmail);
      mockUserService.updateUser.mockResolvedValueOnce(updatedUser);

      const result = await service.findOrCreateGitHubUser(mockGitHubUser);

      expect(mockUserService.findUserByGithubId).toHaveBeenCalledWith('gh123');
      expect(mockUserService.findUserByEmail).toHaveBeenCalledWith('dev@example.com');
      expect(mockUserService.updateUser).toHaveBeenCalledWith('2', {
        githubId: 'gh123',
        avatarUrl: 'http://avatar.com/dev',
      });
      expect(result).toEqual(updatedUser);
    });

    it('should throw if updateUser fails to return user', async () => {
      mockUserService.findUserByGithubId.mockResolvedValueOnce(null);
      const userByEmail = { id: '2', email: 'dev@example.com' };
      (mockUserService.findUserByEmail as jest.Mock).mockResolvedValueOnce(userByEmail);
      mockUserService.updateUser.mockResolvedValueOnce(null);

      await expect(service.findOrCreateGitHubUser(mockGitHubUser)).rejects.toThrow(
        new InternalServerErrorException('Failed to update user'),
      );
    });

    it('should create a new user if not found by githubId or email', async () => {
      mockUserService.findUserByGithubId.mockResolvedValueOnce(null);
      (mockUserService.findUserByEmail as jest.Mock).mockResolvedValueOnce(null);

      const createdUser = { id: '3', ...mockGitHubUser };
      mockUserService.createUser.mockResolvedValueOnce(createdUser);

      const result = await service.findOrCreateGitHubUser(mockGitHubUser);

      expect(mockUserService.findUserByGithubId).toHaveBeenCalledWith('gh123');
      expect(mockUserService.findUserByEmail).toHaveBeenCalledWith('dev@example.com');
      expect(mockUserService.createUser).toHaveBeenCalledWith({
        email: 'dev@example.com',
        firstName: 'Dev',
        lastName: 'Coder',
        githubId: 'gh123',
        avatarUrl: 'http://avatar.com/dev',
        phoneNumber: '',
        password: undefined,
      });
      expect(result).toEqual(createdUser);
    });
  });







});


jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomUUID: jest.fn(() => 'mock-jti'),
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


describe('AuthService', () => {
  let service: AuthService;

  // ---------------- MOCKS ----------------
  const mockUserService: Partial<UserService> = {
    findUserByEmail: jest.fn(async (email) => {
      const hashedPassword = await bcrypt.hash('password', 10);
      return {
        id: '1',
        email,
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        phoneNumber: '1234567890',
      };
    }),
    findUserById: jest.fn(), // default: undefined, set in each test as needed
  };

  const mockJwtService = { sign: jest.fn() };
  const mockRedisService = {
    set: jest.fn(),
    sadd: jest.fn(),
    expire: jest.fn(),
  };

  const mockVerificationService = {};
  const mockEmailService = {};
  const mockCaptchaService = {};
  const mockConfigService = {};

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
    it('should return id when email and password are correct', async () => {
      const id = await service.validateUser('test@example.com', 'password');
      expect(id).toBe('1');
    });

    it('should throw "Wrong password" when password is incorrect', async () => {
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
  });

});

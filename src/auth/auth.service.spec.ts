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
  const mockUserService:Partial<UserService> = {
    findUserByEmail: async (email) => {
      const hashedNewPassword = await bcrypt.hash('password', 10);
      return Promise.resolve({
        id: '1',
        email,
        password: hashedNewPassword,
        firstName: 'Test',
        lastName: 'User',
        phoneNumber: '1234567890',
      });
    },
  };

  const mockJwtService = {};
  const mockRedisService = {};
  const mockVerificationService = {};
  const mockEmailService = {};
  const mockCaptchaService = {};
  const mockConfigService = {};


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



  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('validate user should return id on correct password', async () => {
      const id = await service.validateUser('test@example.com','password');
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id).toBe('1');
    });
    it('validate user should throw wrong password error', async () => {
      await expect(service.validateUser('test@example.com','wrongpassword')).rejects.toThrow('Wrong password');
    });
    it('validate user should throw user not found error', async () => {
      mockUserService.findUserByEmail = async (email) => null;
      await expect(service.validateUser('test@example.com','password')).rejects.toThrow('User not found');
    }); 
  }); 
});

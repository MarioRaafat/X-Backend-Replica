import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            refresh: jest.fn(),
            generateEmailVerification: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    mockAuthService = module.get(AuthService);

    // Add a stub for httpnOnlyRefreshToken if it does not exist
    if (typeof (controller as any).httpnOnlyRefreshToken !== 'function') {
      (controller as any).httpnOnlyRefreshToken = jest.fn();
    }
  });


  describe('signup', () => {

    beforeEach(() => jest.clearAllMocks());

    const dto: RegisterDto = {
       email: 'john@example.com',
       password: 'StrongPass123',
       firstName: 'John',
       lastName: 'Doe',
     } as RegisterDto;

    it('should call authService.register with the correct DTO and return result', async () => {

      const mockResult = {
        message: 'User successfully registered. Check email for verification',
      };

      (mockAuthService.register as jest.Mock).mockResolvedValue(mockResult);

      const result = await controller.signup(dto);

      expect(mockAuthService.register).toHaveBeenCalledTimes(1);
      expect(mockAuthService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockResult);
    });
    
    it('should throw if authService.register throws', async () => {
    const dto = { email: 'error@example.com', password: '123456' } as any;
    mockAuthService.register.mockRejectedValueOnce(new Error('Service failed'));

    await expect(controller.signup(dto)).rejects.toThrow('Service failed');
    expect(mockAuthService.register).toHaveBeenCalledTimes(1);
    expect(mockAuthService.register).toHaveBeenCalledWith(dto);
    });

  });

  describe('generateEmailVerification', () => {

    beforeEach(() => jest.clearAllMocks());

    it('should call authService.generateEmailVerification with the given email', async () => {
      const mockResponse = { message: 'OTP sent' };
      const email = 'test@example.com';
      (mockAuthService.generateEmailVerification as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await controller.generateEmailVerification({ email });

      expect(mockAuthService.generateEmailVerification).toHaveBeenCalledWith(email);
      expect(mockAuthService.generateEmailVerification).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
    });

    it('should throw if service throws', async () => {
      const email = 'fail@example.com';
      mockAuthService.generateEmailVerification.mockRejectedValueOnce(
        new Error('Service failed'),
      );

      await expect(controller.generateEmailVerification({ email })).rejects.toThrow('Service failed');

      expect(mockAuthService.generateEmailVerification).toHaveBeenCalledWith(email);
      expect(mockAuthService.generateEmailVerification).toHaveBeenCalledTimes(1);
    });
  });


  describe('verifyEmail', () => {

    beforeEach(() => jest.clearAllMocks());

    it('should call authService.verifyEmail with correct arguments and return result', async () => {
      const body = { email: 'test@example.com', token: '123456' };
      const mockResult = { success: true };

      mockAuthService.verifyEmail = jest.fn().mockResolvedValue(mockResult);

      const result = await controller.verifyEmail(body);

      expect(mockAuthService.verifyEmail).toHaveBeenCalledWith('test@example.com', '123456');
      expect(mockAuthService.verifyEmail).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockResult);
    });

    it('should throw if authService.verifyEmail throws', async () => {
      const body = { email: 'test@example.com', token: '654321' };

      mockAuthService.verifyEmail = jest.fn().mockRejectedValue(new Error('Invalid OTP'));

      await expect(controller.verifyEmail(body)).rejects.toThrow('Invalid OTP');
      expect(mockAuthService.verifyEmail).toHaveBeenCalledWith('test@example.com', '654321');
      expect(mockAuthService.verifyEmail).toHaveBeenCalledTimes(1);
    });
  });


  describe('handleNotMe', () => {

    beforeEach(() => jest.clearAllMocks());

    it('should call authService.handleNotMe with the correct token and return the result', async () => {
      const mockResult = { message: 'deleted account successfully' };
      mockAuthService.handleNotMe = jest.fn().mockResolvedValue(mockResult);
    
      const result = await controller.handleNotMe('valid-token');
    
      expect(mockAuthService.handleNotMe).toHaveBeenCalledWith('valid-token');
      expect(mockAuthService.handleNotMe).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockResult);
    });
  
    it('should throw if authService.handleNotMe throws', async () => {
      mockAuthService.handleNotMe = jest
        .fn()
        .mockRejectedValue(new Error('Invalid or expired link'));
    
      await expect(controller.handleNotMe('bad-token')).rejects.toThrow(
        'Invalid or expired link',
      );
      expect(mockAuthService.handleNotMe).toHaveBeenCalledWith('bad-token');
      expect(mockAuthService.handleNotMe).toHaveBeenCalledTimes(1);      
    });
  });

  describe('login', () => {

    beforeEach(() => jest.clearAllMocks());

    it('should return access token and user on successful login', async () => {
      const mockLoginDto = { email: 'user@example.com', password: '123456' };
      const mockResult = {
        access_token: 'access123',
        refresh_token: 'refresh123',
        user: { id: 1, email: 'user@example.com' },
      };

      mockAuthService.login.mockResolvedValue(mockResult as any);

      const mockSetCookie = jest.fn();
      (controller as any).httpnOnlyRefreshToken = mockSetCookie;

      const mockResponse = {};

      const result = await controller.login(
        mockLoginDto as any,
        mockResponse as any,
      );

      expect(mockAuthService.login).toHaveBeenCalledWith(mockLoginDto);
      expect(mockSetCookie).toHaveBeenCalledWith(
        mockResponse,
        mockResult.refresh_token,
      );
      expect(result).toEqual({
        access_token: mockResult.access_token,
        user: mockResult.user,
      });
    });

    it('should throw if AuthService.login throws', async () => {
      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

      const mockResponse = {};
      await expect(
        controller.login({ email: 'bad', password: 'wrong' } as any, mockResponse as any),
      ).rejects.toThrow('Invalid credentials');
      expect(mockAuthService.login).toHaveBeenCalledWith({ email: 'bad', password: 'wrong' });
    });

    it('should throw if httpnOnlyRefreshToken fails', async () => {
      const mockLoginDto = { email: 'x', password: 'x' };
      const mockResult = { access_token: 'a', refresh_token: 'r', user: {} };
      mockAuthService.login.mockResolvedValue(mockResult as any);
      (controller as any).httpnOnlyRefreshToken = jest.fn(() => { throw new Error('Cookie set failed'); });

      await expect(controller.login(mockLoginDto as any, {} as any)).rejects.toThrow('Cookie set failed');
    });

  });
  

});
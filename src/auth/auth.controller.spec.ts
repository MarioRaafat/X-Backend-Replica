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
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    mockAuthService = module.get(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('signup', () => {

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



});

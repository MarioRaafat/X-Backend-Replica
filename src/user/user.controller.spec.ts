import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';

describe('UserController', () => {
    let controller: UserController;
    let userService: UserService;

    const mockUserService = {
        findUserById: jest.fn(),
        findUserByEmail: jest.fn(),
        findUserByGithubId: jest.fn(),
        findUserByFacebookId: jest.fn(),
        findUserByGoogleId: jest.fn(),
        createUser: jest.fn(),
        updateUser: jest.fn(),
        updateUserPassword: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [UserController],
            providers: [
                {
                    provide: UserService,
                    useValue: mockUserService,
                },
            ],
        }).compile();

        controller = module.get<UserController>(UserController);
        userService = module.get<UserService>(UserService);
    });

    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
});

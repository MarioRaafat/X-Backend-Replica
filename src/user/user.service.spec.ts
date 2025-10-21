import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from './entities/user.entity';

describe('UserService', () => {
    let service: UserService;
    let repo: jest.Mocked<Repository<User>>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserService,
                {
                    provide: getRepositoryToken(User),
                    useValue: {
                        findOne: jest.fn(),
                        save: jest.fn(),
                        update: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<UserService>(UserService);
        repo = module.get(getRepositoryToken(User));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('findUserById', () => {
        it('should find a user by ID', async () => {
            const mockUser = { id: '1', email: 'a@a.com' } as User;
            repo.findOne.mockResolvedValueOnce(mockUser);

            const result = await service.findUserById('1');

            expect(repo.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
            expect(result).toBe(mockUser);
        });
    });

    describe('findUserByEmail', () => {
        it('should find a user by email', async () => {
            const mockUser = { id: '2', email: 'test@example.com' } as User;
            repo.findOne.mockResolvedValueOnce(mockUser);

            const result = await service.findUserByEmail('test@example.com');

            expect(repo.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
            expect(result).toBe(mockUser);
        });
    });

    describe('findUserByGithubId', () => {
        it('should find a user by github_id', async () => {
            const mockUser = { id: '3', github_id: 'gh123' } as User;
            repo.findOne.mockResolvedValueOnce(mockUser);

            const result = await service.findUserByGithubId('gh123');

            expect(repo.findOne).toHaveBeenCalledWith({ where: { github_id: 'gh123' } });
            expect(result).toBe(mockUser);
        });
    });

    describe('findUserByFacebookId', () => {
        it('should find a user by facebookId', async () => {
            const mockUser = { id: '4', facebook_id: 'fb123' } as User;
            repo.findOne.mockResolvedValueOnce(mockUser);

            const result = await service.findUserByFacebookId('fb123');

            expect(repo.findOne).toHaveBeenCalledWith({ where: { facebook_id: 'fb123' } });
            expect(result).toBe(mockUser);
        });
    });

    describe('findUserByGoogleId', () => {
        it('should find a user by googleId', async () => {
            const mockUser = { id: '5', google_id: 'g123' } as User;
            repo.findOne.mockResolvedValueOnce(mockUser);

            const result = await service.findUserByGoogleId('g123');

            expect(repo.findOne).toHaveBeenCalledWith({ where: { google_id: 'g123' } });
            expect(result).toBe(mockUser);
        });
    });

    describe('createUser', () => {
        it('should create and save a new user', async () => {
            const createUserDto = { email: 'new@example.com' } as any;
            const savedUser = { id: '10', email: 'new@example.com' } as User;
            repo.save.mockResolvedValueOnce(savedUser);

            const result = await service.createUser(createUserDto);

            expect(repo.save).toHaveBeenCalledWith(expect.objectContaining(createUserDto));
            expect(result).toEqual(savedUser);
        });
    });

    describe('updateUser', () => {
        it('should update and return user', async () => {
            const updatedUser = {
                id: '1',
                name: 'Updated User',
                username: 'updateduser',
                email: 'test@example.com',
                password: 'hashedpassword',
                phone_number: '1234567890',
            } as User;
            (repo.update as jest.Mock).mockResolvedValueOnce(undefined);
            repo.findOne.mockResolvedValueOnce(updatedUser);

            const result = await service.updateUser('1', { name: 'Updated User' });

            expect(repo.update).toHaveBeenCalledWith('1', { name: 'Updated User' });
            expect(result).toEqual(updatedUser);
        });
    });

    describe('updateUserPassword', () => {
        it('should update password and return user', async () => {
            const updatedUser = { id: '1', password: 'hashed' } as User;
            (repo.update as jest.Mock).mockResolvedValueOnce(undefined);
            repo.findOne.mockResolvedValueOnce(updatedUser);

            const result = await service.updateUserPassword('1', 'hashed');

            expect(repo.update).toHaveBeenCalledWith('1', { password: 'hashed' });
            expect(result).toEqual(updatedUser);
        });
    });
});

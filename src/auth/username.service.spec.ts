import { Test, TestingModule } from '@nestjs/testing';
import { UsernameService } from './username.service';
import { UserRepository } from 'src/user/user.repository';

describe('UsernameService', () => {
    let service: UsernameService;
    let user_repository: jest.Mocked<UserRepository>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UsernameService,
                {
                    provide: UserRepository,
                    useValue: {
                        findByUsername: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<UsernameService>(UsernameService);
        user_repository = module.get(UserRepository);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('isUsernameAvailable', () => {
        it('should return true if username is available', async () => {
            user_repository.findByUsername.mockResolvedValue(null);

            const result = await service.isUsernameAvailable('testuser');

            expect(result).toBe(true);
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(user_repository.findByUsername).toHaveBeenCalledWith('testuser');
        });

        it('should return false if username is taken', async () => {
            user_repository.findByUsername.mockResolvedValue({ username: 'testuser' } as any);

            const result = await service.isUsernameAvailable('testuser');

            expect(result).toBe(false);
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(user_repository.findByUsername).toHaveBeenCalledWith('testuser');
        });

        it('should return true if an error occurs during lookup', async () => {
            user_repository.findByUsername.mockRejectedValue(new Error('Database error'));

            const result = await service.isUsernameAvailable('testuser');

            expect(result).toBe(true);
        });
    });

    describe('generateUsernameRecommendations', () => {
        beforeEach(() => {
            // Mock Math.random to return predictable values
            jest.spyOn(Math, 'random').mockReturnValue(0.5);
        });

        afterEach(() => {
            jest.spyOn(Math, 'random').mockRestore();
        });

        it('should generate username recommendations from first and last name', async () => {
            user_repository.findByUsername.mockResolvedValue(null);

            const result = await service.generateUsernameRecommendations('John', 'Doe');

            expect(result).toBeDefined();
            expect(result.length).toBeLessThanOrEqual(5);
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(user_repository.findByUsername).toHaveBeenCalled();
        });

        it('should handle names with special characters', async () => {
            user_repository.findByUsername.mockResolvedValue(null);

            const result = await service.generateUsernameRecommendations('John@#$', 'Doe!@#');

            expect(result).toBeDefined();
            expect(result.length).toBeLessThanOrEqual(5);
            result.forEach((username) => {
                expect(username).toMatch(/^[a-z0-9_]+$/);
            });
        });

        it('should handle empty last name', async () => {
            user_repository.findByUsername.mockResolvedValue(null);

            const result = await service.generateUsernameRecommendations('John', '');

            expect(result).toBeDefined();
            expect(result.length).toBeLessThanOrEqual(5);
        });

        it('should generate different patterns when base username is taken', async () => {
            let call_count = 0;
            user_repository.findByUsername.mockImplementation(async (username: string) => {
                call_count++;
                // First call returns existing user, rest return null
                if (call_count === 1) {
                    return { username } as any;
                }
                return null;
            });

            const result = await service.generateUsernameRecommendations('John', 'Doe');

            expect(result).toBeDefined();
            expect(result.length).toBeLessThanOrEqual(5);
        });

        it('should return exactly 5 recommendations', async () => {
            user_repository.findByUsername.mockResolvedValue(null);

            const result = await service.generateUsernameRecommendations('John', 'Doe');

            expect(result).toBeDefined();
            expect(result.length).toBe(5);
        });

        it('should generate recommendations with numbers when needed', async () => {
            let call_count = 0;
            user_repository.findByUsername.mockImplementation(async (username: string) => {
                call_count++;
                // First few calls return taken usernames
                if (call_count <= 2) {
                    return { username } as any;
                }
                return null;
            });

            const result = await service.generateUsernameRecommendations('John', 'Doe');

            expect(result).toBeDefined();
            expect(result.length).toBe(5);
            // Check that some recommendations contain numbers
            const has_numbers = result.some((username) => /\d/.test(username));
            expect(has_numbers).toBe(true);
        });

        it('should handle names with spaces', async () => {
            user_repository.findByUsername.mockResolvedValue(null);

            const result = await service.generateUsernameRecommendations(
                'John Paul',
                'Smith Jones'
            );

            expect(result).toBeDefined();
            expect(result.length).toBe(5);
            result.forEach((username) => {
                expect(username).not.toContain(' ');
            });
        });

        it('should generate lowercase usernames', async () => {
            user_repository.findByUsername.mockResolvedValue(null);

            const result = await service.generateUsernameRecommendations('JOHN', 'DOE');

            expect(result).toBeDefined();
            result.forEach((username) => {
                expect(username).toBe(username.toLowerCase());
            });
        });
    });

    describe('cleanName (private method)', () => {
        it('should clean names properly through generateUsernameRecommendations', async () => {
            user_repository.findByUsername.mockResolvedValue(null);

            const result = await service.generateUsernameRecommendations('John@#$%', 'Doe!@#$%');

            expect(result).toBeDefined();
            result.forEach((username) => {
                // Should only contain alphanumeric characters and underscores
                expect(username).toMatch(/^[a-z0-9_]+$/);
            });
        });

        it('should remove all special characters and spaces', async () => {
            user_repository.findByUsername.mockResolvedValue(null);

            const result = await service.generateUsernameRecommendations('John!!!   ', '   Doe@@@');

            expect(result).toBeDefined();
            result.forEach((username) => {
                expect(username).not.toContain('!');
                expect(username).not.toContain('@');
                expect(username).not.toContain(' ');
            });
        });
    });
});

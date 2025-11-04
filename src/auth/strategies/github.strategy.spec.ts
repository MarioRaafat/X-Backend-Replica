import { Test, TestingModule } from '@nestjs/testing';
import { GitHubStrategy } from './github.strategy';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

describe('GitHubStrategy', () => {
    let strategy: GitHubStrategy;
    let auth_service: jest.Mocked<AuthService>;
    let config_service: jest.Mocked<ConfigService>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GitHubStrategy,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string) => {
                            const config = {
                                GITHUB_CLIENT_ID: 'test-client-id',
                                GITHUB_CLIENT_SECRET: 'test-secret',
                                GITHUB_CALLBACK_URL: 'http://localhost/auth/github/callback',
                            };
                            return config[key];
                        }),
                    },
                },
                {
                    provide: AuthService,
                    useValue: {
                        validateGitHubUser: jest.fn(),
                    },
                },
            ],
        }).compile();

        strategy = module.get<GitHubStrategy>(GitHubStrategy);
        auth_service = module.get(AuthService);
        config_service = module.get(ConfigService);
    });

    it('should be defined', () => {
        expect(strategy).toBeDefined();
    });

    describe('validate', () => {
        it('should validate and return user when user exists', async () => {
            const profile = {
                id: 'github-123',
                username: 'johndoe',
                display_name: 'John Doe',
                emails: [{ value: 'john@example.com' }],
                photos: [{ value: 'http://example.com/photo.jpg' }],
            } as any;

            const mock_user = {
                id: 'user-123',
                email: 'john@example.com',
                first_name: 'John',
                last_name: 'Doe',
            };

            auth_service.validateGitHubUser.mockResolvedValue(mock_user as any);

            const done_spy = jest.fn();

            await strategy.validate('access_token', 'refresh_token', profile, done_spy);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(auth_service.validateGitHubUser).toHaveBeenCalledWith({
                github_id: 'github-123',
                email: 'john@example.com',
                first_name: 'John',
                last_name: 'Doe',
                avatar_url: 'http://example.com/photo.jpg',
            });

            expect(done_spy).toHaveBeenCalledWith(null, mock_user);
        });

        it('should handle user that needs completion', async () => {
            const profile = {
                id: 'github-123',
                username: 'johndoe',
                display_name: 'John Doe',
                emails: [{ value: 'john@example.com' }],
                photos: [],
            } as any;

            const mock_result = {
                needs_completion: true,
                user: { id: 'temp-123', email: 'john@example.com' },
            };

            auth_service.validateGitHubUser.mockResolvedValue(mock_result as any);

            const done_spy = jest.fn();

            await strategy.validate('access_token', 'refresh_token', profile, done_spy);

            expect(done_spy).toHaveBeenCalledWith(null, {
                needs_completion: true,
                user: mock_result.user,
            });
        });

        it('should throw error when profile has no email', async () => {
            const profile = {
                id: 'github-123',
                username: 'johndoe',
                display_name: 'John Doe',
                emails: [],
                photos: [],
            } as any;

            const done_spy = jest.fn();

            await expect(
                strategy.validate('access_token', 'refresh_token', profile, done_spy)
            ).rejects.toThrow('No email found in GitHub profile');
        });

        it('should handle profile with username only when display_name is missing', async () => {
            const profile = {
                id: 'github-123',
                username: 'johndoe',
                display_name: null,
                emails: [{ value: 'john@example.com' }],
                photos: [],
            } as any;

            const mock_user = {
                id: 'user-123',
                email: 'john@example.com',
            };

            auth_service.validateGitHubUser.mockResolvedValue(mock_user as any);

            const done_spy = jest.fn();

            await strategy.validate('access_token', 'refresh_token', profile, done_spy);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(auth_service.validateGitHubUser).toHaveBeenCalledWith(
                expect.objectContaining({
                    first_name: 'johndoe',
                    last_name: '',
                })
            );
        });

        it('should handle profile without photos', async () => {
            const profile = {
                id: 'github-123',
                username: 'johndoe',
                display_name: 'John Doe',
                emails: [{ value: 'john@example.com' }],
                photos: [],
            } as any;

            const mock_user = {
                id: 'user-123',
                email: 'john@example.com',
            };

            auth_service.validateGitHubUser.mockResolvedValue(mock_user as any);

            const done_spy = jest.fn();

            await strategy.validate('access_token', 'refresh_token', profile, done_spy);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(auth_service.validateGitHubUser).toHaveBeenCalledWith(
                expect.objectContaining({
                    avatar_url: undefined,
                })
            );
        });

        it('should handle errors during validation', async () => {
            const profile = {
                id: 'github-123',
                username: 'johndoe',
                display_name: 'John Doe',
                emails: [{ value: 'john@example.com' }],
                photos: [],
            } as any;

            const error = new Error('Validation failed');
            auth_service.validateGitHubUser.mockRejectedValue(error);

            const done_spy = jest.fn();

            await strategy.validate('access_token', 'refresh_token', profile, done_spy);

            expect(done_spy).toHaveBeenCalledWith(error, null);
        });

        it('should split multi-word display name correctly', async () => {
            const profile = {
                id: 'github-123',
                username: 'johndoe',
                display_name: 'John Michael Doe',
                emails: [{ value: 'john@example.com' }],
                photos: [],
            } as any;

            const mock_user = {
                id: 'user-123',
                email: 'john@example.com',
            };

            auth_service.validateGitHubUser.mockResolvedValue(mock_user as any);

            const done_spy = jest.fn();

            await strategy.validate('access_token', 'refresh_token', profile, done_spy);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(auth_service.validateGitHubUser).toHaveBeenCalledWith(
                expect.objectContaining({
                    first_name: 'John',
                    last_name: 'Michael Doe',
                })
            );
        });
    });
});

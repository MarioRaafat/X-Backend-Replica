import { Test, TestingModule } from '@nestjs/testing';
import { FacebookStrategy } from './facebook.strategy';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

describe('FacebookStrategy', () => {
    let strategy: FacebookStrategy;
    let auth_service: jest.Mocked<AuthService>;
    let config_service: jest.Mocked<ConfigService>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FacebookStrategy,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string) => {
                            const config = {
                                FACEBOOK_CLIENT_ID: 'test-client-id',
                                FACEBOOK_SECRET: 'test-secret',
                                FACEBOOK_CALLBACK_URL: 'http://localhost/auth/facebook/callback',
                            };
                            return config[key];
                        }),
                    },
                },
                {
                    provide: AuthService,
                    useValue: {
                        validateFacebookUser: jest.fn(),
                    },
                },
            ],
        }).compile();

        strategy = module.get<FacebookStrategy>(FacebookStrategy);
        auth_service = module.get(AuthService);
        config_service = module.get(ConfigService);
    });

    it('should be defined', () => {
        expect(strategy).toBeDefined();
    });

    describe('validate', () => {
        it('should validate and return user when user exists', async () => {
            const profile = {
                id: 'facebook-123',
                username: 'johndoe',
                displayName: 'John Doe',
                emails: [{ value: 'john@example.com' }],
                photos: [{ value: 'http://example.com/photo.jpg' }],
            };

            const mock_user = {
                id: 'user-123',
                email: 'john@example.com',
                first_name: 'John',
                last_name: 'Doe',
            };

            auth_service.validateFacebookUser.mockResolvedValue(mock_user as any);

            const done_spy = jest.fn();

            await strategy.validate('access_token', 'refresh_token', profile, done_spy);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(auth_service.validateFacebookUser).toHaveBeenCalledWith({
                facebook_id: 'facebook-123',
                email: 'john@example.com',
                first_name: 'John',
                last_name: 'Doe',
                avatar_url: 'http://example.com/photo.jpg',
            });

            expect(done_spy).toHaveBeenCalledWith(null, mock_user);
        });

        it('should handle user that needs completion', async () => {
            const profile = {
                id: 'facebook-123',
                username: 'johndoe',
                displayName: 'John Doe',
                emails: [{ value: 'john@example.com' }],
                photos: [],
            };

            const mock_result = {
                needs_completion: true,
                user: { id: 'temp-123', email: 'john@example.com' },
            };

            auth_service.validateFacebookUser.mockResolvedValue(mock_result as any);

            const done_spy = jest.fn();

            await strategy.validate('access_token', 'refresh_token', profile, done_spy);

            expect(done_spy).toHaveBeenCalledWith(null, {
                needs_completion: true,
                user: mock_result.user,
            });
        });

        it('should handle profile without email and return error', async () => {
            const profile = {
                id: 'facebook-123',
                username: 'johndoe',
                displayName: 'John Doe',
                emails: [],
                photos: [],
            };

            const done_spy = jest.fn();

            await strategy.validate('access_token', 'refresh_token', profile, done_spy);

            expect(done_spy).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'No email found in Facebook profile',
                }),
                null
            );
        });

        it('should handle profile with username only when displayName is missing', async () => {
            const profile = {
                id: 'facebook-123',
                username: 'johndoe',
                displayName: null,
                emails: [{ value: 'john@example.com' }],
                photos: [],
            };

            const mock_user = {
                id: 'user-123',
                email: 'john@example.com',
            };

            auth_service.validateFacebookUser.mockResolvedValue(mock_user as any);

            const done_spy = jest.fn();

            await strategy.validate('access_token', 'refresh_token', profile, done_spy);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(auth_service.validateFacebookUser).toHaveBeenCalledWith(
                expect.objectContaining({
                    first_name: 'johndoe',
                    last_name: '',
                })
            );
        });

        it('should handle profile without photos', async () => {
            const profile = {
                id: 'facebook-123',
                username: 'johndoe',
                displayName: 'John Doe',
                emails: [{ value: 'john@example.com' }],
                photos: [],
            };

            const mock_user = {
                id: 'user-123',
                email: 'john@example.com',
            };

            auth_service.validateFacebookUser.mockResolvedValue(mock_user as any);

            const done_spy = jest.fn();

            await strategy.validate('access_token', 'refresh_token', profile, done_spy);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(auth_service.validateFacebookUser).toHaveBeenCalledWith(
                expect.objectContaining({
                    avatar_url: undefined,
                })
            );
        });

        it('should handle errors during validation', async () => {
            const profile = {
                id: 'facebook-123',
                username: 'johndoe',
                displayName: 'John Doe',
                emails: [{ value: 'john@example.com' }],
                photos: [],
            };

            const error = new Error('Validation failed');
            auth_service.validateFacebookUser.mockRejectedValue(error);

            const done_spy = jest.fn();

            await strategy.validate('access_token', 'refresh_token', profile, done_spy);

            expect(done_spy).toHaveBeenCalledWith(error, null);
        });

        it('should split multi-word display name correctly', async () => {
            const profile = {
                id: 'facebook-123',
                username: 'johndoe',
                displayName: 'John Michael Doe',
                emails: [{ value: 'john@example.com' }],
                photos: [],
            };

            const mock_user = {
                id: 'user-123',
                email: 'john@example.com',
            };

            auth_service.validateFacebookUser.mockResolvedValue(mock_user as any);

            const done_spy = jest.fn();

            await strategy.validate('access_token', 'refresh_token', profile, done_spy);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(auth_service.validateFacebookUser).toHaveBeenCalledWith(
                expect.objectContaining({
                    first_name: 'John',
                    last_name: 'Michael Doe',
                })
            );
        });
    });
});

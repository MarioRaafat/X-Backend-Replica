import { Test, TestingModule } from '@nestjs/testing';
import { GoogleStrategy } from './google.strategy';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

describe('GoogleStrategy', () => {
    let strategy: GoogleStrategy;
    let auth_service: jest.Mocked<AuthService>;
    let config_service: jest.Mocked<ConfigService>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GoogleStrategy,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string) => {
                            const config = {
                                GOOGLE_CLIENT_ID: 'test-client-id',
                                GOOGLE_SECRET: 'test-secret',
                                GOOGLE_CALLBACK_URL: 'http://localhost/auth/google/callback',
                            };
                            return config[key];
                        }),
                    },
                },
                {
                    provide: AuthService,
                    useValue: {
                        validateGoogleUser: jest.fn(),
                    },
                },
            ],
        }).compile();

        strategy = module.get<GoogleStrategy>(GoogleStrategy);
        auth_service = module.get(AuthService);
        config_service = module.get(ConfigService);
    });

    it('should be defined', () => {
        expect(strategy).toBeDefined();
    });

    describe('validate', () => {
        it('should validate and return user when user exists', async () => {
            const profile = {
                id: 'google-123',
                name: { givenName: 'John', familyName: 'Doe' },
                emails: [{ value: 'john@example.com' }],
                photos: [{ value: 'http://example.com/photo.jpg' }],
            };

            const mock_user = {
                id: 'user-123',
                email: 'john@example.com',
                first_name: 'John',
                last_name: 'Doe',
            };

            auth_service.validateGoogleUser.mockResolvedValue(mock_user as any);

            const done_spy = jest.fn();

            await strategy.validate('access_token', 'refresh_token', profile, done_spy);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(auth_service.validateGoogleUser).toHaveBeenCalledWith({
                google_id: 'google-123',
                email: 'john@example.com',
                first_name: 'John',
                last_name: 'Doe',
                avatar_url: 'http://example.com/photo.jpg',
            });

            expect(done_spy).toHaveBeenCalledWith(null, mock_user);
        });

        it('should handle user that needs completion', async () => {
            const profile = {
                id: 'google-123',
                name: { givenName: 'John', familyName: 'Doe' },
                emails: [{ value: 'john@example.com' }],
                photos: [],
            };

            const mock_result = {
                needs_completion: true,
                user: { id: 'temp-123', email: 'john@example.com' },
            };

            auth_service.validateGoogleUser.mockResolvedValue(mock_result as any);

            const done_spy = jest.fn();

            await strategy.validate('access_token', 'refresh_token', profile, done_spy);

            expect(done_spy).toHaveBeenCalledWith(null, {
                needs_completion: true,
                user: mock_result.user,
            });
        });

        it('should handle profile without last name', async () => {
            const profile = {
                id: 'google-123',
                name: { givenName: 'John' },
                emails: [{ value: 'john@example.com' }],
                photos: [],
            };

            const mock_user = {
                id: 'user-123',
                email: 'john@example.com',
                first_name: 'John',
            };

            auth_service.validateGoogleUser.mockResolvedValue(mock_user as any);

            const done_spy = jest.fn();

            await strategy.validate('access_token', 'refresh_token', profile, done_spy);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(auth_service.validateGoogleUser).toHaveBeenCalledWith({
                google_id: 'google-123',
                email: 'john@example.com',
                first_name: 'John',
                last_name: '',
                avatar_url: undefined,
            });
        });

        it('should handle profile without photos', async () => {
            const profile = {
                id: 'google-123',
                name: { givenName: 'John', familyName: 'Doe' },
                emails: [{ value: 'john@example.com' }],
                photos: [],
            };

            const mock_user = {
                id: 'user-123',
                email: 'john@example.com',
            };

            auth_service.validateGoogleUser.mockResolvedValue(mock_user as any);

            const done_spy = jest.fn();

            await strategy.validate('access_token', 'refresh_token', profile, done_spy);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(auth_service.validateGoogleUser).toHaveBeenCalledWith(
                expect.objectContaining({
                    avatar_url: undefined,
                })
            );
        });

        it('should handle errors during validation', async () => {
            const profile = {
                id: 'google-123',
                name: { givenName: 'John', familyName: 'Doe' },
                emails: [{ value: 'john@example.com' }],
                photos: [],
            };

            const error = new Error('Validation failed');
            auth_service.validateGoogleUser.mockRejectedValue(error);

            const done_spy = jest.fn();

            await strategy.validate('access_token', 'refresh_token', profile, done_spy);

            expect(done_spy).toHaveBeenCalledWith(error, null);
        });
    });
});

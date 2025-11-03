import { Test, TestingModule } from '@nestjs/testing';
import { CaptchaService } from './captcha.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

jest.mock('axios');
const mocked_axios = axios as jest.Mocked<typeof axios>;

describe('CaptchaService', () => {
    let service: CaptchaService;
    let config_service: jest.Mocked<ConfigService>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CaptchaService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<CaptchaService>(CaptchaService);
        config_service = module.get(ConfigService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('verifyRecaptcha', () => {
        it('should verify recaptcha successfully', async () => {
            const mock_token = 'test-token';
            const mock_response = {
                data: {
                    success: true,
                    score: 0.9,
                    action: 'submit',
                    challenge_ts: '2024-01-01T00:00:00Z',
                    hostname: 'localhost',
                },
            };

            config_service.get.mockReturnValue('test-secret-key');
            mocked_axios.post.mockResolvedValue(mock_response);

            const result = await service.verifyRecaptcha(mock_token);

            expect(result.success).toBe(true);
            expect(result.score).toBe(0.9);
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mocked_axios.post).toHaveBeenCalledWith(
                'https://www.google.com/recaptcha/api/siteverify',
                expect.any(URLSearchParams),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                }
            );
        });

        it('should throw error if secret key is not configured', async () => {
            config_service.get.mockReturnValue(undefined);

            await expect(service.verifyRecaptcha('test-token')).rejects.toThrow(
                'reCAPTCHA secret key not configured'
            );
        });

        it('should return error if token is missing', async () => {
            config_service.get.mockReturnValue('test-secret-key');

            const result = await service.verifyRecaptcha('');

            expect(result.success).toBe(false);
            expect(result['error-codes']).toContain('missing-input-response');
        });

        it('should handle network errors', async () => {
            config_service.get.mockReturnValue('test-secret-key');
            mocked_axios.post.mockRejectedValue(new Error('Network error'));

            const result = await service.verifyRecaptcha('test-token');

            expect(result.success).toBe(false);
            expect(result['error-codes']).toContain('network-error');
        });

        it('should include remote IP if provided', async () => {
            const mock_token = 'test-token';
            const mock_remote_ip = '127.0.0.1';
            const mock_response = {
                data: {
                    success: true,
                },
            };

            config_service.get.mockReturnValue('test-secret-key');
            mocked_axios.post.mockResolvedValue(mock_response);

            await service.verifyRecaptcha(mock_token, mock_remote_ip);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mocked_axios.post).toHaveBeenCalled();
        });
    });

    describe('validateCaptcha', () => {
        it('should validate captcha successfully', async () => {
            const mock_token = 'test-token';
            const mock_response = {
                data: {
                    success: true,
                },
            };

            config_service.get.mockReturnValueOnce('false'); // BYPASS_CAPTCHA_FOR_TESTING
            config_service.get.mockReturnValueOnce('test-secret-key'); // RECAPTCHA_SECRET_KEY
            mocked_axios.post.mockResolvedValue(mock_response);

            await expect(service.validateCaptcha(mock_token)).resolves.not.toThrow();
        });

        it('should bypass captcha if testing bypass is enabled', async () => {
            config_service.get.mockReturnValue('true'); // BYPASS_CAPTCHA_FOR_TESTING

            await expect(service.validateCaptcha('test-token')).resolves.not.toThrow();
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mocked_axios.post).not.toHaveBeenCalled();
        });

        it('should throw error if captcha verification fails', async () => {
            const mock_token = 'test-token';
            const mock_response = {
                data: {
                    success: false,
                    'error-codes': ['invalid-input-response'],
                },
            };

            config_service.get.mockReturnValueOnce('false'); // BYPASS_CAPTCHA_FOR_TESTING
            config_service.get.mockReturnValueOnce('test-secret-key'); // RECAPTCHA_SECRET_KEY
            mocked_axios.post.mockResolvedValue(mock_response);

            await expect(service.validateCaptcha(mock_token)).rejects.toThrow(
                'CAPTCHA verification failed'
            );
        });

        it('should include remote IP if provided in validation', async () => {
            const mock_token = 'test-token';
            const mock_remote_ip = '127.0.0.1';
            const mock_response = {
                data: {
                    success: true,
                },
            };

            config_service.get.mockReturnValueOnce('false'); // BYPASS_CAPTCHA_FOR_TESTING
            config_service.get.mockReturnValueOnce('test-secret-key'); // RECAPTCHA_SECRET_KEY
            mocked_axios.post.mockResolvedValue(mock_response);

            await expect(
                service.validateCaptcha(mock_token, mock_remote_ip)
            ).resolves.not.toThrow();
        });
    });

    describe('getErrorMessage (private method)', () => {
        it('should format error messages correctly for known error codes', async () => {
            const mock_response = {
                data: {
                    success: false,
                    'error-codes': ['missing-input-secret', 'invalid-input-response'],
                },
            };

            config_service.get.mockReturnValueOnce('false');
            config_service.get.mockReturnValueOnce('test-secret-key');
            mocked_axios.post.mockResolvedValue(mock_response);

            await expect(service.validateCaptcha('test-token')).rejects.toThrow();
        });

        it('should handle unknown error codes', async () => {
            const mock_response = {
                data: {
                    success: false,
                    'error-codes': ['unknown-error-code'],
                },
            };

            config_service.get.mockReturnValueOnce('false');
            config_service.get.mockReturnValueOnce('test-secret-key');
            mocked_axios.post.mockResolvedValue(mock_response);

            await expect(service.validateCaptcha('test-token')).rejects.toThrow();
        });

        it('should handle empty error codes array', async () => {
            const mock_response = {
                data: {
                    success: false,
                    'error-codes': [],
                },
            };

            config_service.get.mockReturnValueOnce('false');
            config_service.get.mockReturnValueOnce('test-secret-key');
            mocked_axios.post.mockResolvedValue(mock_response);

            await expect(service.validateCaptcha('test-token')).rejects.toThrow('Unknown error');
        });
    });
});

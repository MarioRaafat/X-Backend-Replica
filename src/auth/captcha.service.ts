import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface ICaptchaVerificationResult {
    success: boolean;
    score?: number; // For reCAPTCHA v3
    action?: string; // For reCAPTCHA v3
    challenge_ts?: string;
    hostname?: string;
    'error-codes'?: string[];
}

@Injectable()
export class CaptchaService {
    constructor(private readonly config_service: ConfigService) {}

    async verifyRecaptcha(token: string, remote_ip?: string): Promise<ICaptchaVerificationResult> {
        const secret_key = this.config_service.get<string>('RECAPTCHA_SECRET_KEY');

        if (!secret_key) {
            throw new Error('reCAPTCHA secret key not configured');
        }

        if (!token) {
            return {
                success: false,
                'error-codes': ['missing-input-response'],
            };
        }

        try {
            const response = await axios.post(
                'https://www.google.com/recaptcha/api/siteverify',
                new URLSearchParams({
                    secret: secret_key,
                    response: token,
                    ...(remote_ip && { remoteip: remote_ip }),
                }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                }
            );

            return response.data as ICaptchaVerificationResult;
        } catch (error) {
            console.error('reCAPTCHA verification error:', error);
            return {
                success: false,
                'error-codes': ['network-error'],
            };
        }
    }

    async validateCaptcha(token: string, remote_ip?: string): Promise<void> {
        // Check if CAPTCHA bypass is enabled for testing
        const bypass_captcha = this.config_service.get<string>('BYPASS_CAPTCHA_FOR_TESTING');

        if (bypass_captcha === 'true') {
            console.log('CAPTCHA bypassed for testing purposes');
            return;
        }

        const verification_result = await this.verifyRecaptcha(token, remote_ip);

        if (!verification_result.success) {
            const error_codes = verification_result['error-codes'] || [];
            const error_message = this.getErrorMessage(error_codes);
            throw new Error(`CAPTCHA verification failed: ${error_message}`);
        }
    }

    private getErrorMessage(error_codes: string[]): string {
        const error_messages: { [key: string]: string } = {
            'missing-input-secret': 'The secret parameter is missing',
            'invalid-input-secret': 'The secret parameter is invalid or malformed',
            'missing-input-response': 'The response parameter (CAPTCHA token) is missing',
            'invalid-input-response':
                'The response parameter (CAPTCHA token) is invalid or malformed',
            'bad-request': 'The request is invalid or malformed',
            'timeout-or-duplicate':
                'The response is no longer valid: either is too old or has been used previously',
            'network-error': 'Network error occurred while verifying CAPTCHA',
        };

        if (error_codes.length === 0) {
            return 'Unknown error';
        }

        return error_codes
            .map((code) => error_messages[code] || `Unknown error code: ${code}`)
            .join(', ');
    }
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface CaptchaVerificationResult {
  success: boolean;
  score?: number; // For reCAPTCHA v3
  action?: string; // For reCAPTCHA v3
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}

@Injectable()
export class CaptchaService {
  constructor(private readonly configService: ConfigService) {}

  async verifyRecaptcha(token: string, remoteIp?: string): Promise<CaptchaVerificationResult> {
    const secretKey = this.configService.get<string>('RECAPTCHA_SECRET_KEY');
    
    if (!secretKey) {
      throw new Error('reCAPTCHA secret key not configured');
    }

    if (!token) {
      return {
        success: false,
        'error-codes': ['missing-input-response']
      };
    }

    try {
      const response = await axios.post(
        'https://www.google.com/recaptcha/api/siteverify',
        new URLSearchParams({
          secret: secretKey,
          response: token,
          ...(remoteIp && { remoteip: remoteIp })
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data as CaptchaVerificationResult;
    } catch (error) {
      console.error('reCAPTCHA verification error:', error);
      return {
        success: false,
        'error-codes': ['network-error']
      };
    }
  }


  async validateCaptcha(token: string, remoteIp?: string): Promise<void> {
    const result = await this.verifyRecaptcha(token, remoteIp);
    
    if (!result.success) {
      const errorCodes = result['error-codes'] || [];
      const errorMessage = this.getErrorMessage(errorCodes);
      throw new Error(`CAPTCHA verification failed: ${errorMessage}`);
    }
  }

  private getErrorMessage(errorCodes: string[]): string {
    const errorMessages: { [key: string]: string } = {
      'missing-input-secret': 'The secret parameter is missing',
      'invalid-input-secret': 'The secret parameter is invalid or malformed',
      'missing-input-response': 'The response parameter (CAPTCHA token) is missing',
      'invalid-input-response': 'The response parameter (CAPTCHA token) is invalid or malformed',
      'bad-request': 'The request is invalid or malformed',
      'timeout-or-duplicate': 'The response is no longer valid: either is too old or has been used previously',
      'network-error': 'Network error occurred while verifying CAPTCHA'
    };

    if (errorCodes.length === 0) {
      return 'Unknown error';
    }

    return errorCodes
      .map(code => errorMessages[code] || `Unknown error code: ${code}`)
      .join(', ');
  }
}

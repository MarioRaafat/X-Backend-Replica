import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
    private algorithm = 'aes-256-cbc';
    private encryptionKey: Buffer;
    private ivLength = 16; // Initialization vector length for AES
    private readonly DEFAULT_ENCRYPTION_KEY =
        'yapper-default-encryption-key-fallback-value-change-in-production-environment'; // Fallback for development

    constructor(private readonly configService: ConfigService) {
        // Get encryption key from environment or use fallback for development
        const key = this.configService.get<string>('ENCRYPTION_KEY') || this.DEFAULT_ENCRYPTION_KEY;

        if (!key || key === this.DEFAULT_ENCRYPTION_KEY) {
            console.warn(
                '⚠️  WARNING: Using default encryption key! This is insecure for production.\n' +
                    'Generate a secure key using: npm run generate-encryption-key\n' +
                    'Then add it to your .env file as: ENCRYPTION_KEY=your-generated-key'
            );
        }

        // Ensure key is exactly 32 bytes (256 bits) for AES-256
        this.encryptionKey = crypto.createHash('sha256').update(key).digest();
    }

    /**
     * Encrypts plain text message content
     * Returns format: iv:encryptedData (both hex encoded)
     */
    encrypt(plaintext: string): string {
        const iv = crypto.randomBytes(this.ivLength);
        const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

        let encrypted = cipher.update(plaintext, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        // Return IV and encrypted data separated by colon for storage
        return `${iv.toString('hex')}:${encrypted}`;
    }

    /**
     * Decrypts encrypted message content
     * Expects format: iv:encryptedData (both hex encoded)
     */
    decrypt(encrypted_data: string): string {
        const parts = encrypted_data.split(':');
        if (parts.length !== 2) {
            throw new Error('Invalid encrypted data format');
        }

        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];

        const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }

    /**
     * Generates a secure encryption key
     * Use this to generate a key for your environment file
     */
    static generateEncryptionKey(): string {
        return crypto.randomBytes(32).toString('hex');
    }
}

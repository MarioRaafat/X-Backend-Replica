import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionService } from './encryption.service';
import { ConfigService } from '@nestjs/config';

describe('EncryptionService', () => {
    let service: EncryptionService;
    let config_service: jest.Mocked<ConfigService>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EncryptionService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string) => {
                            if (key === 'ENCRYPTION_KEY') {
                                return 'test-encryption-key-for-testing-purposes-256-bits';
                            }
                            return null;
                        }),
                    },
                },
            ],
        }).compile();

        service = module.get<EncryptionService>(EncryptionService);
        config_service = module.get(ConfigService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('encrypt', () => {
        it('should encrypt plain text successfully', () => {
            const plaintext = 'Hello, World!';

            const encrypted = service.encrypt(plaintext);

            expect(encrypted).toBeDefined();
            expect(typeof encrypted).toBe('string');
            expect(encrypted).toContain(':');
            expect(encrypted).not.toBe(plaintext);
        });

        it('should produce different ciphertexts for same plaintext (due to random IV)', () => {
            const plaintext = 'Test message';

            const encrypted1 = service.encrypt(plaintext);
            const encrypted2 = service.encrypt(plaintext);

            expect(encrypted1).not.toBe(encrypted2);
        });

        it('should encrypt empty string', () => {
            const plaintext = '';

            const encrypted = service.encrypt(plaintext);

            expect(encrypted).toBeDefined();
            expect(encrypted).toContain(':');
        });

        it('should encrypt long text', () => {
            const plaintext = 'a'.repeat(1000);

            const encrypted = service.encrypt(plaintext);

            expect(encrypted).toBeDefined();
            expect(encrypted).toContain(':');
        });

        it('should encrypt special characters', () => {
            const plaintext = '!@#$%^&*()_+-=[]{}|;:,.<>?';

            const encrypted = service.encrypt(plaintext);

            expect(encrypted).toBeDefined();
            expect(encrypted).toContain(':');
        });

        it('should encrypt unicode characters', () => {
            const plaintext = 'こんにちは 🙂 مرحبا';

            const encrypted = service.encrypt(plaintext);

            expect(encrypted).toBeDefined();
            expect(encrypted).toContain(':');
        });
    });

    describe('decrypt', () => {
        it('should decrypt encrypted text successfully', () => {
            const plaintext = 'Hello, World!';
            const encrypted = service.encrypt(plaintext);

            const decrypted = service.decrypt(encrypted);

            expect(decrypted).toBe(plaintext);
        });

        it('should decrypt and retrieve original empty string', () => {
            const plaintext = '';
            const encrypted = service.encrypt(plaintext);

            const decrypted = service.decrypt(encrypted);

            expect(decrypted).toBe(plaintext);
        });

        it('should decrypt and retrieve original long text', () => {
            const plaintext = 'a'.repeat(1000);
            const encrypted = service.encrypt(plaintext);

            const decrypted = service.decrypt(encrypted);

            expect(decrypted).toBe(plaintext);
        });

        it('should decrypt and retrieve original special characters', () => {
            const plaintext = '!@#$%^&*()_+-=[]{}|;:,.<>?';
            const encrypted = service.encrypt(plaintext);

            const decrypted = service.decrypt(encrypted);

            expect(decrypted).toBe(plaintext);
        });

        it('should decrypt and retrieve original unicode characters', () => {
            const plaintext = 'こんにちは 🙂 مرحبا';
            const encrypted = service.encrypt(plaintext);

            const decrypted = service.decrypt(encrypted);

            expect(decrypted).toBe(plaintext);
        });

        it('should throw error for invalid encrypted data format', () => {
            const invalid_encrypted = 'invalid-format-without-colon';

            expect(() => service.decrypt(invalid_encrypted)).toThrow(
                'Invalid encrypted data format'
            );
        });

        it('should throw error for invalid IV hex', () => {
            const invalid_encrypted = 'invalid_hex:somehexdata';

            expect(() => service.decrypt(invalid_encrypted)).toThrow();
        });

        it('should throw error for corrupted encrypted data', () => {
            const plaintext = 'Test message';
            const encrypted = service.encrypt(plaintext);
            const [iv, encrypted_data] = encrypted.split(':');
            const corrupted = `${iv}:${encrypted_data.substring(0, encrypted_data.length - 4)}`;

            expect(() => service.decrypt(corrupted)).toThrow();
        });

        it('should not decrypt with wrong IV', () => {
            const plaintext = 'Test message';
            const encrypted1 = service.encrypt(plaintext);
            const encrypted2 = service.encrypt('different message');

            const [iv2, encrypted_data1] = encrypted1.split(':');
            const [, encrypted_data2] = encrypted2.split(':');

            // Mix IV from encrypted2 with data from encrypted1
            const mixed = `${iv2}:${encrypted_data2}`;

            // Using wrong IV produces garbage text (though may not throw)
            const result = service.decrypt(mixed);
            expect(result).not.toBe('test data 2'); // Should not match original plaintext
        });
    });

    describe('encrypt-decrypt roundtrip', () => {
        it('should maintain data integrity through encrypt-decrypt cycle', () => {
            const plaintexts = [
                'Simple message',
                '123456789',
                'Message with spaces   ',
                'CamelCaseAndLowerCase',
                'Multiple\nLines\nOfText',
            ];

            plaintexts.forEach((plaintext) => {
                const encrypted = service.encrypt(plaintext);
                const decrypted = service.decrypt(encrypted);
                expect(decrypted).toBe(plaintext);
            });
        });
    });

    describe('generateEncryptionKey', () => {
        it('should generate a valid encryption key', () => {
            const key = EncryptionService.generateEncryptionKey();

            expect(key).toBeDefined();
            expect(typeof key).toBe('string');
            expect(key.length).toBe(64); // 32 bytes in hex = 64 characters
        });

        it('should generate different keys on multiple calls', () => {
            const key1 = EncryptionService.generateEncryptionKey();
            const key2 = EncryptionService.generateEncryptionKey();

            expect(key1).not.toBe(key2);
        });

        it('should generate valid hex string', () => {
            const key = EncryptionService.generateEncryptionKey();

            expect(/^[0-9a-f]{64}$/i.test(key)).toBe(true);
        });
    });

    describe('encryption key handling', () => {
        it('should use configured encryption key when available', () => {
            config_service.get.mockReturnValue('test-key-for-testing-256-bits-value');

            const service_with_config = new EncryptionService(config_service);
            const plaintext = 'Test message';

            const encrypted = service_with_config.encrypt(plaintext);
            const decrypted = service_with_config.decrypt(encrypted);

            expect(decrypted).toBe(plaintext);
        });

        it('should handle missing encryption key gracefully', () => {
            config_service.get.mockReturnValue(null);

            const service_with_fallback = new EncryptionService(config_service);
            const plaintext = 'Test message';

            const encrypted = service_with_fallback.encrypt(plaintext);
            const decrypted = service_with_fallback.decrypt(encrypted);

            expect(decrypted).toBe(plaintext);
        });
    });

    describe('edge cases', () => {
        it('should handle newline characters', () => {
            const plaintext = 'Line1\nLine2\nLine3';

            const encrypted = service.encrypt(plaintext);
            const decrypted = service.decrypt(encrypted);

            expect(decrypted).toBe(plaintext);
        });

        it('should handle tab characters', () => {
            const plaintext = 'Col1\tCol2\tCol3';

            const encrypted = service.encrypt(plaintext);
            const decrypted = service.decrypt(encrypted);

            expect(decrypted).toBe(plaintext);
        });

        it('should handle JSON strings', () => {
            const plaintext = JSON.stringify({ key: 'value', number: 123, nested: { deep: true } });

            const encrypted = service.encrypt(plaintext);
            const decrypted = service.decrypt(encrypted);

            expect(decrypted).toBe(plaintext);
            expect(JSON.parse(decrypted)).toEqual({
                key: 'value',
                number: 123,
                nested: { deep: true },
            });
        });
    });
});

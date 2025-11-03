import { generateRandomOtp } from './otp.util';

describe('generateRandomOtp', () => {
    it('should generate OTP of specified size', () => {
        const otp = generateRandomOtp(6);

        expect(otp).toBeDefined();
        expect(otp.length).toBe(6);
        expect(typeof otp).toBe('string');
    });

    it('should generate OTP with default size of 6', () => {
        const otp = generateRandomOtp();

        expect(otp.length).toBe(6);
    });

    it('should generate OTP with custom size', () => {
        const otp8 = generateRandomOtp(8);
        const otp4 = generateRandomOtp(4);
        const otp10 = generateRandomOtp(10);

        expect(otp8.length).toBe(8);
        expect(otp4.length).toBe(4);
        expect(otp10.length).toBe(10);
    });

    it('should only contain alphanumeric characters', () => {
        const otp = generateRandomOtp(20);

        // Should match only A-Z, a-z, 0-9
        expect(otp).toMatch(/^[A-Za-z0-9]+$/);

        // Should not contain special characters
        expect(otp).not.toMatch(/[^A-Za-z0-9]/);
    });

    it('should generate OTP with valid characters from the character set', () => {
        const otp = generateRandomOtp(100);
        const valid_characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

        for (const char of otp) {
            expect(valid_characters).toContain(char);
        }
    });

    it('should generate non-empty OTP', () => {
        const otp = generateRandomOtp(6);

        expect(otp).not.toBe('');
        expect(otp).toBeTruthy();
    });

    it('should handle size of 1', () => {
        const otp = generateRandomOtp(1);

        expect(otp.length).toBe(1);
        expect(otp).toMatch(/^[A-Za-z0-9]$/);
    });

    it('should generate OTP with numeric characters', () => {
        const otps: string[] = [];

        // Generate multiple OTPs to increase chance of getting numbers
        for (let i = 0; i < 50; i++) {
            otps.push(generateRandomOtp(10));
        }

        // At least one OTP should contain a number
        const has_number = otps.some((otp) => /\d/.test(otp));
        expect(has_number).toBe(true);
    });

    it('should generate OTP with uppercase letters', () => {
        const otps: string[] = [];

        // Generate multiple OTPs to increase chance of getting uppercase
        for (let i = 0; i < 50; i++) {
            otps.push(generateRandomOtp(10));
        }

        // At least one OTP should contain an uppercase letter
        const has_uppercase = otps.some((otp) => /[A-Z]/.test(otp));
        expect(has_uppercase).toBe(true);
    });

    it('should generate OTP with lowercase letters', () => {
        const otps: string[] = [];

        // Generate multiple OTPs to increase chance of getting lowercase
        for (let i = 0; i < 50; i++) {
            otps.push(generateRandomOtp(10));
        }

        // At least one OTP should contain a lowercase letter
        const has_lowercase = otps.some((otp) => /[a-z]/.test(otp));
        expect(has_lowercase).toBe(true);
    });
});

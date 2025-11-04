import { validate } from 'class-validator';
import { OtpEmailJobDto } from './email-job.dto';
import { STRING_MAX_LENGTH } from 'src/constants/variables';

describe('OtpEmailJobDto', () => {
    let dto: OtpEmailJobDto;

    beforeEach(() => {
        dto = new OtpEmailJobDto();
    });

    describe('valid DTO', () => {
        it('should pass validation with all required fields', async () => {
            dto.email = 'test@example.com';
            dto.username = 'test_user';
            dto.otp = '123456';
            dto.email_type = 'verification';

            const errors = await validate(dto);

            expect(errors.length).toBe(0);
        });

        it('should pass validation with optional not_me_link', async () => {
            dto.email = 'user@example.com';
            dto.username = 'username';
            dto.otp = 'ABC123';
            dto.email_type = 'reset_password';
            dto.not_me_link = 'https://example.com/not-me';

            const errors = await validate(dto);

            expect(errors.length).toBe(0);
        });

        it('should pass validation with update_email type', async () => {
            dto.email = 'new@example.com';
            dto.username = 'user123';
            dto.otp = 'OTP789';
            dto.email_type = 'update_email';

            const errors = await validate(dto);

            expect(errors.length).toBe(0);
        });
    });

    describe('email validation', () => {
        beforeEach(() => {
            dto.username = 'test_user';
            dto.otp = '123456';
            dto.email_type = 'verification';
        });

        it('should fail validation with invalid email', async () => {
            dto.email = 'invalid-email';

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].property).toBe('email');
            expect(errors[0].constraints).toHaveProperty('isEmail');
        });

        it('should fail validation with empty email', async () => {
            dto.email = '';

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
        });

        it('should fail validation when email exceeds max length', async () => {
            dto.email = 'a'.repeat(STRING_MAX_LENGTH + 1) + '@example.com';

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('maxLength');
        });
    });

    describe('username validation', () => {
        beforeEach(() => {
            dto.email = 'test@example.com';
            dto.otp = '123456';
            dto.email_type = 'verification';
        });

        it('should pass validation with valid username', async () => {
            dto.username = 'valid_username';

            const errors = await validate(dto);

            expect(errors.length).toBe(0);
        });

        it('should fail validation when username exceeds max length', async () => {
            dto.username = 'a'.repeat(STRING_MAX_LENGTH + 1);

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('maxLength');
        });

        it('should fail validation with non-string username', async () => {
            dto.username = 12345 as any;

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('isString');
        });
    });

    describe('otp validation', () => {
        beforeEach(() => {
            dto.email = 'test@example.com';
            dto.username = 'test_user';
            dto.email_type = 'verification';
        });

        it('should pass validation with valid otp', async () => {
            dto.otp = '123456';

            const errors = await validate(dto);

            expect(errors.length).toBe(0);
        });

        it('should fail validation when otp exceeds max length', async () => {
            dto.otp = 'a'.repeat(STRING_MAX_LENGTH + 1);

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('maxLength');
        });

        it('should fail validation with non-string otp', async () => {
            dto.otp = 123456 as any;

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('isString');
        });
    });

    describe('email_type validation', () => {
        beforeEach(() => {
            dto.email = 'test@example.com';
            dto.username = 'test_user';
            dto.otp = '123456';
        });

        it('should pass validation with verification type', async () => {
            dto.email_type = 'verification';

            const errors = await validate(dto);

            expect(errors.length).toBe(0);
        });

        it('should pass validation with reset_password type', async () => {
            dto.email_type = 'reset_password';

            const errors = await validate(dto);

            expect(errors.length).toBe(0);
        });

        it('should pass validation with update_email type', async () => {
            dto.email_type = 'update_email';

            const errors = await validate(dto);

            expect(errors.length).toBe(0);
        });

        it('should fail validation with non-string email_type', async () => {
            dto.email_type = 123 as any;

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('isString');
        });

        it('should fail validation when email_type exceeds max length', async () => {
            dto.email_type = 'a'.repeat(STRING_MAX_LENGTH + 1) as any;

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('maxLength');
        });
    });

    describe('not_me_link validation', () => {
        beforeEach(() => {
            dto.email = 'test@example.com';
            dto.username = 'test_user';
            dto.otp = '123456';
            dto.email_type = 'verification';
        });

        it('should pass validation without not_me_link', async () => {
            const errors = await validate(dto);

            expect(errors.length).toBe(0);
        });

        it('should pass validation with valid not_me_link', async () => {
            dto.not_me_link = 'https://example.com/not-me';

            const errors = await validate(dto);

            expect(errors.length).toBe(0);
        });

        it('should fail validation when not_me_link exceeds 500 characters', async () => {
            dto.not_me_link = 'https://example.com/' + 'a'.repeat(500);

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('maxLength');
        });

        it('should fail validation with non-string not_me_link', async () => {
            dto.not_me_link = 12345 as any;

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('isString');
        });
    });
});

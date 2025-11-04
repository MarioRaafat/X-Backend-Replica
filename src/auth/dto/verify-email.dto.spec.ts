import { validate } from 'class-validator';
import { VerifyEmailDto } from './verify-email.dto';
import { STRING_MAX_LENGTH } from 'src/constants/variables';

describe('VerifyEmailDto', () => {
    let dto: VerifyEmailDto;

    beforeEach(() => {
        dto = new VerifyEmailDto();
    });

    describe('valid DTO', () => {
        it('should pass validation with valid email and 6-digit token', async () => {
            dto.email = 'test@example.com';
            dto.token = '123456';

            const errors = await validate(dto);

            expect(errors.length).toBe(0);
        });

        it('should pass validation with valid email and 6-letter token', async () => {
            dto.email = 'user@gmail.com';
            dto.token = 'ABCDEF';

            const errors = await validate(dto);

            expect(errors.length).toBe(0);
        });

        it('should pass validation with mixed alphanumeric token', async () => {
            dto.email = 'another@example.com';
            dto.token = 'A1B2C3';

            const errors = await validate(dto);

            expect(errors.length).toBe(0);
        });
    });

    describe('email validation', () => {
        beforeEach(() => {
            dto.token = '123456';
        });

        it('should fail validation with invalid email format', async () => {
            dto.email = 'invalid-email';

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].property).toBe('email');
            expect(errors[0].constraints).toHaveProperty('isEmail');
            expect(errors[0].constraints?.isEmail).toContain('valid email address');
        });

        it('should fail validation with empty email', async () => {
            dto.email = '';

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('isNotEmpty');
            expect(errors[0].constraints?.isNotEmpty).toContain('Email is required');
        });

        it('should fail validation when email exceeds max length', async () => {
            dto.email = 'a'.repeat(STRING_MAX_LENGTH + 1) + '@example.com';

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('maxLength');
        });

        it('should fail validation with null email', async () => {
            dto.email = null as any;

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
        });

        it('should fail validation with undefined email', async () => {
            dto.email = undefined as any;

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
        });
    });

    describe('token validation', () => {
        beforeEach(() => {
            dto.email = 'test@example.com';
        });

        it('should fail validation with token shorter than 6 characters', async () => {
            dto.token = '12345';

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].property).toBe('token');
            expect(errors[0].constraints).toHaveProperty('isLength');
            expect(errors[0].constraints?.isLength).toContain('exactly 6 characters');
        });

        it('should fail validation with token longer than 6 characters', async () => {
            dto.token = '1234567';

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('isLength');
            expect(errors[0].constraints?.isLength).toContain('exactly 6 characters');
        });

        it('should fail validation with empty token', async () => {
            dto.token = '';

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('isNotEmpty');
            expect(errors[0].constraints?.isNotEmpty).toContain('Token is required');
        });

        it('should fail validation with non-string token', async () => {
            dto.token = 123456 as any;

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('isString');
            expect(errors[0].constraints?.isString).toContain('must be a string');
        });

        it('should fail validation with null token', async () => {
            dto.token = null as any;

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
        });

        it('should fail validation with undefined token', async () => {
            dto.token = undefined as any;

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
        });
    });
});

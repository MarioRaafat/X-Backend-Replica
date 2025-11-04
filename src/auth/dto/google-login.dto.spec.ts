import { validate } from 'class-validator';
import { GoogleLoginDTO } from './google-login.dto';
import { STRING_MAX_LENGTH } from 'src/constants/variables';

describe('GoogleLoginDTO', () => {
    let dto: GoogleLoginDTO;

    beforeEach(() => {
        dto = new GoogleLoginDTO();
    });

    describe('valid DTO', () => {
        it('should pass validation with all required fields', async () => {
            dto.google_id = '1234567890';
            dto.email = 'test@example.com';
            dto.first_name = 'John';
            dto.last_name = 'Doe';

            const errors = await validate(dto);

            expect(errors.length).toBe(0);
        });

        it('should pass validation with optional avatar_url', async () => {
            dto.google_id = '9876543210';
            dto.email = 'user@gmail.com';
            dto.first_name = 'Jane';
            dto.last_name = 'Smith';
            dto.avatar_url = 'https://example.com/avatar.jpg';

            const errors = await validate(dto);

            expect(errors.length).toBe(0);
        });

        it('should pass validation without avatar_url', async () => {
            dto.google_id = 'google123';
            dto.email = 'another@example.com';
            dto.first_name = 'Alice';
            dto.last_name = 'Johnson';

            const errors = await validate(dto);

            expect(errors.length).toBe(0);
        });
    });

    describe('google_id validation', () => {
        beforeEach(() => {
            dto.email = 'test@example.com';
            dto.first_name = 'John';
            dto.last_name = 'Doe';
        });

        it('should fail validation with non-string google_id', async () => {
            dto.google_id = 123456 as any;

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('isString');
        });

        it('should fail validation when google_id exceeds max length', async () => {
            dto.google_id = 'a'.repeat(STRING_MAX_LENGTH + 1);

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('maxLength');
        });
    });

    describe('email validation', () => {
        beforeEach(() => {
            dto.google_id = '1234567890';
            dto.first_name = 'John';
            dto.last_name = 'Doe';
        });

        it('should fail validation with invalid email format', async () => {
            dto.email = 'invalid-email';

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('isEmail');
        });

        it('should fail validation when email exceeds max length', async () => {
            dto.email = 'a'.repeat(STRING_MAX_LENGTH) + '@example.com';

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('maxLength');
        });
    });

    describe('first_name validation', () => {
        beforeEach(() => {
            dto.google_id = '1234567890';
            dto.email = 'test@example.com';
            dto.last_name = 'Doe';
        });

        it('should fail validation with empty first_name', async () => {
            dto.first_name = '';

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('isNotEmpty');
        });

        it('should fail validation with non-string first_name', async () => {
            dto.first_name = 123 as any;

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('isString');
        });

        it('should fail validation when first_name exceeds max length', async () => {
            dto.first_name = 'a'.repeat(STRING_MAX_LENGTH + 1);

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('maxLength');
        });
    });

    describe('last_name validation', () => {
        beforeEach(() => {
            dto.google_id = '1234567890';
            dto.email = 'test@example.com';
            dto.first_name = 'John';
        });

        it('should fail validation with empty last_name', async () => {
            dto.last_name = '';

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('isNotEmpty');
        });

        it('should fail validation with non-string last_name', async () => {
            dto.last_name = 456 as any;

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('isString');
        });

        it('should fail validation when last_name exceeds max length', async () => {
            dto.last_name = 'a'.repeat(STRING_MAX_LENGTH + 1);

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('maxLength');
        });
    });

    describe('avatar_url validation', () => {
        beforeEach(() => {
            dto.google_id = '1234567890';
            dto.email = 'test@example.com';
            dto.first_name = 'John';
            dto.last_name = 'Doe';
        });

        it('should pass validation with valid avatar_url', async () => {
            dto.avatar_url = 'https://lh3.googleusercontent.com/avatar.jpg';

            const errors = await validate(dto);

            expect(errors.length).toBe(0);
        });

        it('should fail validation with non-string avatar_url', async () => {
            dto.avatar_url = 12345 as any;

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('isString');
        });

        it('should fail validation when avatar_url exceeds 500 characters', async () => {
            dto.avatar_url = 'https://example.com/' + 'a'.repeat(500);

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('maxLength');
        });
    });
});

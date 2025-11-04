import { validate } from 'class-validator';
import { FacebookLoginDTO } from './facebook-login.dto';
import { STRING_MAX_LENGTH } from 'src/constants/variables';

describe('FacebookLoginDTO', () => {
    let dto: FacebookLoginDTO;

    beforeEach(() => {
        dto = new FacebookLoginDTO();
    });

    it('should be defined', () => {
        expect(dto).toBeDefined();
    });

    describe('facebook_id validation', () => {
        beforeEach(() => {
            dto.email = 'test@example.com';
            dto.first_name = 'John';
            dto.last_name = 'Doe';
        });

        it('should pass validation with valid facebook_id', async () => {
            dto.facebook_id = '1234567890';

            const errors = await validate(dto);

            expect(errors.length).toBe(0);
        });

        it('should fail validation with non-string facebook_id', async () => {
            dto.facebook_id = 123 as any;

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].property).toBe('facebook_id');
            expect(errors[0].constraints).toHaveProperty('isString');
        });

        it('should fail validation with facebook_id exceeding max length', async () => {
            dto.facebook_id = 'a'.repeat(STRING_MAX_LENGTH + 1);

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('maxLength');
        });
    });

    describe('email validation', () => {
        beforeEach(() => {
            dto.facebook_id = 'fb123';
            dto.first_name = 'John';
            dto.last_name = 'Doe';
        });

        it('should pass validation with valid email', async () => {
            dto.email = 'john@example.com';

            const errors = await validate(dto);

            expect(errors.length).toBe(0);
        });

        it('should fail validation with invalid email format', async () => {
            dto.email = 'invalid-email';

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].property).toBe('email');
            expect(errors[0].constraints).toHaveProperty('isEmail');
        });

        it('should fail validation with email exceeding max length', async () => {
            const long_email = 'a'.repeat(STRING_MAX_LENGTH) + '@example.com';
            dto.email = long_email;

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('maxLength');
        });
    });

    describe('first_name validation', () => {
        beforeEach(() => {
            dto.facebook_id = 'fb123';
            dto.email = 'test@example.com';
            dto.last_name = 'Doe';
        });

        it('should pass validation with valid first_name', async () => {
            dto.first_name = 'John';

            const errors = await validate(dto);

            expect(errors.length).toBe(0);
        });

        it('should fail validation with empty first_name', async () => {
            dto.first_name = '';

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].property).toBe('first_name');
            expect(errors[0].constraints).toHaveProperty('isNotEmpty');
        });

        it('should fail validation with non-string first_name', async () => {
            dto.first_name = 123 as any;

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('isString');
        });

        it('should fail validation with first_name exceeding max length', async () => {
            dto.first_name = 'a'.repeat(STRING_MAX_LENGTH + 1);

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('maxLength');
        });
    });

    describe('last_name validation', () => {
        beforeEach(() => {
            dto.facebook_id = 'fb123';
            dto.email = 'test@example.com';
            dto.first_name = 'John';
        });

        it('should pass validation with valid last_name', async () => {
            dto.last_name = 'Doe';

            const errors = await validate(dto);

            expect(errors.length).toBe(0);
        });

        it('should fail validation with empty last_name', async () => {
            dto.last_name = '';

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].property).toBe('last_name');
            expect(errors[0].constraints).toHaveProperty('isNotEmpty');
        });

        it('should fail validation with non-string last_name', async () => {
            dto.last_name = 123 as any;

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('isString');
        });

        it('should fail validation with last_name exceeding max length', async () => {
            dto.last_name = 'a'.repeat(STRING_MAX_LENGTH + 1);

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('maxLength');
        });
    });

    describe('avatar_url validation', () => {
        beforeEach(() => {
            dto.facebook_id = 'fb123';
            dto.email = 'test@example.com';
            dto.first_name = 'John';
            dto.last_name = 'Doe';
        });

        it('should pass validation without avatar_url (optional)', async () => {
            const errors = await validate(dto);

            expect(errors.length).toBe(0);
        });

        it('should pass validation with valid avatar_url', async () => {
            dto.avatar_url = 'https://example.com/avatar.jpg';

            const errors = await validate(dto);

            expect(errors.length).toBe(0);
        });

        it('should fail validation with non-string avatar_url', async () => {
            dto.avatar_url = 123 as any;

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].property).toBe('avatar_url');
            expect(errors[0].constraints).toHaveProperty('isString');
        });

        it('should fail validation with avatar_url exceeding 500 characters', async () => {
            dto.avatar_url = 'https://example.com/' + 'a'.repeat(500);

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('maxLength');
        });

        it('should pass validation with undefined avatar_url', async () => {
            dto.avatar_url = undefined;

            const errors = await validate(dto);

            expect(errors.length).toBe(0);
        });
    });
});

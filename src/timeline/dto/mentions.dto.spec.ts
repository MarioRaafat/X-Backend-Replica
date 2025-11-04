import { validate } from 'class-validator';
import { MentionsDto } from './mentions.dto';

describe('MentionsDto', () => {
    let dto: MentionsDto;

    beforeEach(() => {
        dto = new MentionsDto();
    });

    it('should be defined', () => {
        expect(dto).toBeDefined();
    });

    describe('user_id validation', () => {
        it('should pass validation with valid user_id', async () => {
            dto.user_id = 'user123456789';

            const errors = await validate(dto);

            expect(errors.length).toBe(0);
        });

        it('should fail validation with empty user_id', async () => {
            dto.user_id = '';

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].property).toBe('user_id');
            expect(errors[0].constraints).toHaveProperty('isNotEmpty');
        });

        it('should fail validation with non-string user_id', async () => {
            dto.user_id = 123 as any;

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('isString');
        });

        it('should fail validation with user_id exceeding 50 characters', async () => {
            dto.user_id = 'a'.repeat(51);

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('maxLength');
        });

        it('should pass validation with user_id at max length (50 chars)', async () => {
            dto.user_id = 'a'.repeat(50);

            const errors = await validate(dto);

            expect(errors.length).toBe(0);
        });

        it('should fail validation with null user_id', async () => {
            dto.user_id = null as any;

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].property).toBe('user_id');
        });

        it('should fail validation with undefined user_id', async () => {
            dto.user_id = undefined as any;

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].property).toBe('user_id');
        });
    });

    describe('inherited properties', () => {
        it('should inherit limit property from TimelinePaginationDto', () => {
            dto.limit = 10;
            expect(dto.limit).toBe(10);
        });

        it('should inherit cursor property from TimelinePaginationDto', () => {
            dto.cursor = 'abc123';
            expect(dto.cursor).toBe('abc123');
        });
    });
});

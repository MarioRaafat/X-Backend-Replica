import { validate } from 'class-validator';
import { AssignInterestsDto } from './assign-interests.dto';

describe('AssignInterestsDto', () => {
    let dto: AssignInterestsDto;

    beforeEach(() => {
        dto = new AssignInterestsDto();
    });

    describe('category_ids validation', () => {
        it('should pass validation with valid category IDs', async () => {
            dto.category_ids = [1, 2, 3];

            const errors = await validate(dto);

            expect(errors.length).toBe(0);
        });

        it('should pass validation with single category ID', async () => {
            dto.category_ids = [5];

            const errors = await validate(dto);

            expect(errors.length).toBe(0);
        });

        it('should pass validation with category IDs at boundaries', async () => {
            dto.category_ids = [1, 30];

            const errors = await validate(dto);

            expect(errors.length).toBe(0);
        });

        it('should pass validation with empty array', async () => {
            dto.category_ids = [];

            const errors = await validate(dto);

            expect(errors.length).toBe(0);
        });

        it('should fail validation with duplicate category IDs', async () => {
            dto.category_ids = [1, 2, 2, 3];

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('arrayUnique');
        });

        it('should fail validation with category ID below minimum', async () => {
            dto.category_ids = [0, 2, 3];

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            const min_constraint = errors[0].constraints?.min;
            expect(min_constraint).toContain('Category ID must be a positive integer');
        });

        it('should fail validation with negative category ID', async () => {
            dto.category_ids = [-1, 2, 3];

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
        });

        it('should fail validation with category ID above maximum', async () => {
            dto.category_ids = [1, 2, 31];

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            const max_constraint = errors[0].constraints?.max;
            expect(max_constraint).toContain('Category ID must not exceed 30');
        });

        it('should fail validation with non-integer values', async () => {
            dto.category_ids = [1.5, 2, 3] as any;

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('isInt');
        });

        it('should fail validation with string values', async () => {
            dto.category_ids = ['1', '2', '3'] as any;

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('isInt');
        });

        it('should fail validation with non-array value', async () => {
            dto.category_ids = 'not an array' as any;

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('isArray');
        });

        it('should fail validation with null', async () => {
            dto.category_ids = null as any;

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
        });

        it('should fail validation with undefined', async () => {
            dto.category_ids = undefined as any;

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
        });
    });
});

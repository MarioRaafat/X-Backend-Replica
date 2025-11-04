import { validate } from 'class-validator';
import { TrendsDto } from './trends.dto';
import { STRING_MAX_LENGTH } from 'src/constants/variables';

describe('TrendsDto', () => {
    let dto: TrendsDto;

    beforeEach(() => {
        dto = new TrendsDto();
    });

    it('should be defined', () => {
        expect(dto).toBeDefined();
    });

    describe('category validation', () => {
        const valid_categories = [
            'technology',
            'sports',
            'entertainment',
            'politics',
            'business',
            'health',
            'science',
            'travel',
            'food',
            'fashion',
            'all',
        ];

        valid_categories.forEach((category) => {
            it(`should pass validation with valid category: ${category}`, async () => {
                dto.category = category;

                const errors = await validate(dto);

                expect(errors.length).toBe(0);
            });
        });

        it('should fail validation with empty category', async () => {
            dto.category = '';

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].property).toBe('category');
            expect(errors[0].constraints).toHaveProperty('isNotEmpty');
        });

        it('should fail validation with non-string category', async () => {
            dto.category = 123 as any;

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('isString');
        });

        it('should fail validation with category exceeding max length', async () => {
            dto.category = 'a'.repeat(STRING_MAX_LENGTH + 1);

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('maxLength');
        });

        it('should pass validation with category at max length', async () => {
            dto.category = 'a'.repeat(STRING_MAX_LENGTH);

            const errors = await validate(dto);

            expect(errors.length).toBe(0);
        });

        it('should fail validation with null category', async () => {
            dto.category = null as any;

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].property).toBe('category');
        });

        it('should fail validation with undefined category', async () => {
            dto.category = undefined as any;

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].property).toBe('category');
        });

        it('should pass validation with custom category string', async () => {
            dto.category = 'custom_category';

            const errors = await validate(dto);

            expect(errors.length).toBe(0);
        });
    });
});

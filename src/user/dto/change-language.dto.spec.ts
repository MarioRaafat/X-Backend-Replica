import { validate } from 'class-validator';
import { ChangeLanguageDto } from './change-language.dto';

describe('ChangeLanguageDto', () => {
    let dto: ChangeLanguageDto;

    beforeEach(() => {
        dto = new ChangeLanguageDto();
    });

    describe('language validation', () => {
        it('should pass validation with "en" language', async () => {
            dto.language = 'en';

            const errors = await validate(dto);

            expect(errors.length).toBe(0);
        });

        it('should pass validation with "ar" language', async () => {
            dto.language = 'ar';

            const errors = await validate(dto);

            expect(errors.length).toBe(0);
        });

        it('should fail validation with invalid language', async () => {
            dto.language = 'fr' as any;

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('isIn');
            expect(errors[0].constraints?.isIn).toContain('Language must be either "en" or "ar"');
        });

        it('should fail validation with empty string', async () => {
            dto.language = '' as any;

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
        });

        it('should fail validation with number', async () => {
            dto.language = 123 as any;

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
        });

        it('should fail validation with null', async () => {
            dto.language = null as any;

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
        });
    });
});

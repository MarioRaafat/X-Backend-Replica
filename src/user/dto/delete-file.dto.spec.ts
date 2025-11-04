import { validate } from 'class-validator';
import { DeleteFileDto } from './delete-file.dto';

describe('DeleteFileDto', () => {
    let dto: DeleteFileDto;

    beforeEach(() => {
        dto = new DeleteFileDto();
    });

    describe('file_url validation', () => {
        it('should pass validation with valid HTTPS URL', async () => {
            dto.file_url =
                'https://yapperdev.blob.core.windows.net/profile-images/3cda6108-8cb6-411b-9457-fbd8ffbf77ee-1761902534288-kurosensi.png';

            const errors = await validate(dto);

            expect(errors.length).toBe(0);
        });

        it('should pass validation with valid HTTP URL', async () => {
            dto.file_url = 'http://example.com/file.jpg';

            const errors = await validate(dto);

            expect(errors.length).toBe(0);
        });

        it('should fail validation with non-URL string', async () => {
            dto.file_url = 'not-a-url';

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('isUrl');
        });

        it('should fail validation with empty string', async () => {
            dto.file_url = '';

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('isNotEmpty');
        });

        it('should fail validation with null', async () => {
            dto.file_url = null as any;

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
        });

        it('should fail validation with undefined', async () => {
            dto.file_url = undefined as any;

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
        });

        it('should fail validation when URL exceeds 500 characters', async () => {
            dto.file_url = 'https://example.com/' + 'a'.repeat(500);

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('maxLength');
        });

        it('should pass validation with URL at 500 character limit', async () => {
            const base_url = 'https://example.com/';
            dto.file_url = base_url + 'a'.repeat(500 - base_url.length);

            const errors = await validate(dto);

            expect(errors.length).toBe(0);
        });

        it('should fail validation with non-string value', async () => {
            dto.file_url = 12345 as any;

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('isString');
        });
    });
});

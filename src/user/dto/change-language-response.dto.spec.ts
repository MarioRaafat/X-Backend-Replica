import { ChangeLanguageResponseDto } from './change-language-response.dto';

describe('ChangeLanguageResponseDto', () => {
    it('should be defined', () => {
        expect(ChangeLanguageResponseDto).toBeDefined();
    });

    it('should create an instance', () => {
        const dto = new ChangeLanguageResponseDto();
        expect(dto).toBeInstanceOf(ChangeLanguageResponseDto);
    });

    it('should accept "en" language', () => {
        const dto = new ChangeLanguageResponseDto();
        dto.language = 'en';
        expect(dto.language).toBe('en');
    });

    it('should accept "ar" language', () => {
        const dto = new ChangeLanguageResponseDto();
        dto.language = 'ar';
        expect(dto.language).toBe('ar');
    });

    it('should only accept "en" or "ar" values', () => {
        const dto = new ChangeLanguageResponseDto();
        dto.language = 'en';
        expect(['en', 'ar']).toContain(dto.language);

        dto.language = 'ar';
        expect(['en', 'ar']).toContain(dto.language);
    });
});

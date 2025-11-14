import { UploadFileResponseDto } from './upload-file-response.dto';

describe('UploadFileResponseDto', () => {
    it('should be defined', () => {
        expect(UploadFileResponseDto).toBeDefined();
    });

    it('should create an instance', () => {
        const dto = new UploadFileResponseDto();
        expect(dto).toBeInstanceOf(UploadFileResponseDto);
    });

    it('should have image_url and image_name properties', () => {
        const dto = new UploadFileResponseDto();
        dto.image_url = 'https://example.com/image.jpg';
        dto.image_name = 'image.jpg';

        expect(dto.image_url).toBe('https://example.com/image.jpg');
        expect(dto.image_name).toBe('image.jpg');
    });

    it('should handle complete upload response', () => {
        const dto = new UploadFileResponseDto();
        dto.image_url = 'https://storage.azure.com/container/file123.png';
        dto.image_name = 'file123.png';

        expect(dto.image_url).toContain('https://');
        expect(dto.image_name).toContain('.png');
    });

    it('should handle different image formats', () => {
        const dto = new UploadFileResponseDto();
        dto.image_url = 'https://example.com/avatar.gif';
        dto.image_name = 'avatar.gif';

        expect(dto.image_url).toBe('https://example.com/avatar.gif');
        expect(dto.image_name).toBe('avatar.gif');
    });
});

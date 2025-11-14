import { CreateVerificationDto } from './create-verification.dto';

describe('CreateVerificationDto', () => {
    it('should be defined', () => {
        expect(CreateVerificationDto).toBeDefined();
    });

    it('should create an instance', () => {
        const dto = new CreateVerificationDto();
        expect(dto).toBeInstanceOf(CreateVerificationDto);
    });

    it('should be an empty class', () => {
        const dto = new CreateVerificationDto();
        expect(Object.keys(dto)).toHaveLength(0);
    });
});

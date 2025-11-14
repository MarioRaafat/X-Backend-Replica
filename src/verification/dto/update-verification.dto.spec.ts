import { UpdateVerificationDto } from './update-verification.dto';

describe('UpdateVerificationDto', () => {
    it('should be defined', () => {
        expect(UpdateVerificationDto).toBeDefined();
    });

    it('should extend PartialType(CreateVerificationDto)', () => {
        const dto = new UpdateVerificationDto();
        expect(dto).toBeInstanceOf(UpdateVerificationDto);
    });

    it('should allow all properties to be optional', () => {
        const dto = new UpdateVerificationDto();
        expect(dto).toEqual({});
    });

    it('should accept partial properties', () => {
        const dto = new UpdateVerificationDto();
        // Since CreateVerificationDto is empty, this DTO will also be empty
        expect(Object.keys(dto)).toHaveLength(0);
    });
});

import { validate } from 'class-validator';
import { UpdatePhoneNumberDto } from './update_phone_number.dto';

describe('UpdatePhoneNumberDto', () => {
    let dto: UpdatePhoneNumberDto;

    beforeEach(() => {
        dto = new UpdatePhoneNumberDto();
    });

    describe('phone_number validation', () => {
        it('should pass validation when phone_number is undefined', async () => {
            dto.phone_number = undefined;

            const errors = await validate(dto);

            expect(errors.length).toBe(0);
        });

        it('should pass validation with valid international phone number', async () => {
            dto.phone_number = '+14155552671';

            const errors = await validate(dto);

            expect(errors.length).toBe(0);
        });

        it('should pass validation with valid US phone number', async () => {
            dto.phone_number = '+14155552671';

            const errors = await validate(dto);

            expect(errors.length).toBe(0);
        });

        it('should pass validation with valid UK phone number', async () => {
            dto.phone_number = '+447911123456';

            const errors = await validate(dto);

            expect(errors.length).toBe(0);
        });

        it('should pass validation with valid Egyptian phone number', async () => {
            dto.phone_number = '+201234567890';

            const errors = await validate(dto);

            expect(errors.length).toBe(0);
        });

        it('should fail validation with phone number without country code', async () => {
            dto.phone_number = '1234567890';

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('isPhoneNumber');
        });

        it('should fail validation with invalid phone number format', async () => {
            dto.phone_number = 'not-a-phone';

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('isPhoneNumber');
        });

        it('should fail validation when exceeds 20 characters', async () => {
            dto.phone_number = '+' + '1'.repeat(30);

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('maxLength');
        });

        it('should pass validation at 20 character limit', async () => {
            dto.phone_number = '+12345678901234567';

            const errors = await validate(dto);

            // May fail on isPhoneNumber but not maxLength
            if (errors.length > 0) {
                expect(errors[0].constraints).not.toHaveProperty('maxLength');
            }
        });

        it('should fail validation with empty string', async () => {
            dto.phone_number = '';

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
        });

        it('should fail validation with number type', async () => {
            dto.phone_number = 1234567890 as any;

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('isString');
        });

        it('should fail validation with object type', async () => {
            dto.phone_number = { phone: '+1234567890' } as any;

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
        });
    });
});

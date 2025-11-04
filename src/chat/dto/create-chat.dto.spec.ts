import { validate } from 'class-validator';
import { CreateChatDto } from './create-chat.dto';

describe('CreateChatDto', () => {
    it('should pass validation with valid recipient_id', async () => {
        const dto = new CreateChatDto();
        dto.recipient_id = '123e4567-e89b-12d3-a456-426614174000';

        const errors = await validate(dto);
        expect(errors.length).toBe(0);
    });

    it('should fail validation when recipient_id is empty', async () => {
        const dto = new CreateChatDto();
        dto.recipient_id = '';

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('recipient_id');
    });

    it('should fail validation when recipient_id is missing', async () => {
        const dto = new CreateChatDto();

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('recipient_id');
    });

    it('should fail validation when recipient_id is not a UUID', async () => {
        const dto = new CreateChatDto();
        dto.recipient_id = 'not-a-uuid';

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('recipient_id');
        expect(errors[0].constraints).toHaveProperty('isUuid');
    });

    it('should fail validation when recipient_id is not a string', async () => {
        const dto = new CreateChatDto();
        (dto.recipient_id as any) = 123;

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('recipient_id');
    });
});

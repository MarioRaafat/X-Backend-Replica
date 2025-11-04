import { validate } from 'class-validator';
import { UpdateMessageDto } from './update-message.dto';

describe('UpdateMessageDto', () => {
    it('should pass validation with valid content', async () => {
        const dto = new UpdateMessageDto();
        dto.content = 'Updated message content';

        const errors = await validate(dto);
        expect(errors.length).toBe(0);
    });

    it('should fail validation when content is empty', async () => {
        const dto = new UpdateMessageDto();
        dto.content = '';

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('content');
    });

    it('should fail validation when content is missing', async () => {
        const dto = new UpdateMessageDto();

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('content');
    });

    it('should fail validation when content is too short', async () => {
        const dto = new UpdateMessageDto();
        dto.content = '';

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('content');
        expect(errors[0].constraints).toHaveProperty('minLength');
    });

    it('should fail validation when content exceeds max length', async () => {
        const dto = new UpdateMessageDto();
        dto.content = 'a'.repeat(1001);

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('content');
        expect(errors[0].constraints).toHaveProperty('maxLength');
    });

    it('should pass validation when content is at max length', async () => {
        const dto = new UpdateMessageDto();
        dto.content = 'a'.repeat(1000);

        const errors = await validate(dto);
        expect(errors.length).toBe(0);
    });

    it('should fail validation when content is not a string', async () => {
        const dto = new UpdateMessageDto();
        (dto.content as any) = 123;

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('content');
    });
});

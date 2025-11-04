import { validate } from 'class-validator';
import { MarkMessagesReadDto } from './mark-messages-read.dto';

describe('MarkMessagesReadDto', () => {
    it('should pass validation with valid last_read_message_id', async () => {
        const dto = new MarkMessagesReadDto();
        dto.last_read_message_id = '123e4567-e89b-12d3-a456-426614174000';

        const errors = await validate(dto);
        expect(errors.length).toBe(0);
    });

    it('should pass validation when last_read_message_id is not provided', async () => {
        const dto = new MarkMessagesReadDto();

        const errors = await validate(dto);
        expect(errors.length).toBe(0);
    });

    it('should pass validation when last_read_message_id is undefined', async () => {
        const dto = new MarkMessagesReadDto();
        dto.last_read_message_id = undefined;

        const errors = await validate(dto);
        expect(errors.length).toBe(0);
    });

    it('should fail validation when last_read_message_id is not a UUID', async () => {
        const dto = new MarkMessagesReadDto();
        dto.last_read_message_id = 'not-a-uuid';

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('last_read_message_id');
        expect(errors[0].constraints).toHaveProperty('isUuid');
    });

    it('should fail validation when last_read_message_id is not a string', async () => {
        const dto = new MarkMessagesReadDto();
        (dto.last_read_message_id as any) = 123;

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('last_read_message_id');
    });

    it('should fail validation when last_read_message_id is empty string', async () => {
        const dto = new MarkMessagesReadDto();
        dto.last_read_message_id = '';

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('last_read_message_id');
    });
});

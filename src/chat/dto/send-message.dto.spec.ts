import { validate } from 'class-validator';
import { SendMessageDto } from './send-message.dto';
import { MessageType } from '../entities/message.entity';

describe('SendMessageDto', () => {
    it('should pass validation with valid content', async () => {
        const dto = new SendMessageDto();
        dto.content = 'Hello, how are you?';

        const errors = await validate(dto);
        expect(errors.length).toBe(0);
    });

    it('should pass validation with valid content and message_type', async () => {
        const dto = new SendMessageDto();
        dto.content = 'Check out this image!';
        dto.message_type = MessageType.REPLY;

        const errors = await validate(dto);
        expect(errors.length).toBe(0);
    });

    it('should pass validation with reply_to_message_id', async () => {
        const dto = new SendMessageDto();
        dto.content = 'Replying to your message';
        dto.reply_to_message_id = '123e4567-e89b-12d3-a456-426614174000';

        const errors = await validate(dto);
        expect(errors.length).toBe(0);
    });

    it('should fail validation when content is empty', async () => {
        const dto = new SendMessageDto();
        dto.content = '';

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('content');
    });

    it('should fail validation when content is missing', async () => {
        const dto = new SendMessageDto();

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('content');
    });

    it('should fail validation when content is too short', async () => {
        const dto = new SendMessageDto();
        dto.content = '';

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('content');
        expect(errors[0].constraints).toHaveProperty('minLength');
    });

    it('should fail validation when content exceeds max length', async () => {
        const dto = new SendMessageDto();
        dto.content = 'a'.repeat(1001);

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('content');
        expect(errors[0].constraints).toHaveProperty('maxLength');
    });

    it('should pass validation when content is at max length', async () => {
        const dto = new SendMessageDto();
        dto.content = 'a'.repeat(1000);

        const errors = await validate(dto);
        expect(errors.length).toBe(0);
    });

    it('should fail validation when message_type is invalid', async () => {
        const dto = new SendMessageDto();
        dto.content = 'Hello';
        (dto.message_type as any) = 'INVALID_TYPE';

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('message_type');
        expect(errors[0].constraints).toHaveProperty('isEnum');
    });

    it('should fail validation when reply_to_message_id is not a UUID', async () => {
        const dto = new SendMessageDto();
        dto.content = 'Replying';
        dto.reply_to_message_id = 'not-a-uuid';

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('reply_to_message_id');
        expect(errors[0].constraints).toHaveProperty('isUuid');
    });

    it('should use default message_type when not provided', () => {
        const dto = new SendMessageDto();
        expect(dto.message_type).toBe(MessageType.TEXT);
    });
});

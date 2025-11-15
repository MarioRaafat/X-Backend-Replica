import { Message, MessageType } from './message.entity';

describe('Message Entity', () => {
    it('should create a message entity instance', () => {
        const message = new Message();
        expect(message).toBeDefined();
        expect(message).toBeInstanceOf(Message);
    });

    it('should have id property', () => {
        const message = new Message();
        message.id = '123e4567-e89b-12d3-a456-426614174000';
        expect(message.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should have content property', () => {
        const message = new Message();
        message.content = 'Hello, how are you?';
        expect(message.content).toBe('Hello, how are you?');
    });

    it('should have message_type property with default TEXT', () => {
        const message = new Message();
        message.message_type = MessageType.TEXT;
        expect(message.message_type).toBe(MessageType.TEXT);
    });

    it('should support REPLY message type', () => {
        const message = new Message();
        message.message_type = MessageType.REPLY;
        expect(message.message_type).toBe(MessageType.REPLY);
    });

    it('should have sender_id property', () => {
        const message = new Message();
        message.sender_id = 'sender-uuid';
        expect(message.sender_id).toBe('sender-uuid');
    });

    it('should have chat_id property', () => {
        const message = new Message();
        message.chat_id = 'chat-uuid';
        expect(message.chat_id).toBe('chat-uuid');
    });

    it('should have reply_to_message_id property', () => {
        const message = new Message();
        message.reply_to_message_id = 'reply-message-uuid';
        expect(message.reply_to_message_id).toBe('reply-message-uuid');
    });

    it('should allow null reply_to_message_id', () => {
        const message = new Message();
        message.reply_to_message_id = null;
        expect(message.reply_to_message_id).toBeNull();
    });

    it('should have is_read property with default false', () => {
        const message = new Message();
        message.is_read = false;
        expect(message.is_read).toBe(false);
    });

    it('should have is_edited property with default false', () => {
        const message = new Message();
        message.is_edited = false;
        expect(message.is_edited).toBe(false);
    });

    it('should have is_deleted property with default false', () => {
        const message = new Message();
        message.is_deleted = false;
        expect(message.is_deleted).toBe(false);
    });

    it('should have created_at property', () => {
        const message = new Message();
        const now = new Date();
        message.created_at = now;
        expect(message.created_at).toBe(now);
    });

    it('should have updated_at property', () => {
        const message = new Message();
        const now = new Date();
        message.updated_at = now;
        expect(message.updated_at).toBe(now);
    });

    it('should have deleted_at property', () => {
        const message = new Message();
        const now = new Date();
        message.deleted_at = now;
        expect(message.deleted_at).toBe(now);
    });

    it('should allow null deleted_at', () => {
        const message = new Message();
        message.deleted_at = null;
        expect(message.deleted_at).toBeNull();
    });

    it('should allow setting all properties', () => {
        const message = new Message();
        const now = new Date();

        message.id = 'msg-uuid';
        message.content = 'Test message';
        message.message_type = MessageType.TEXT;
        message.sender_id = 'sender-uuid';
        message.chat_id = 'chat-uuid';
        message.reply_to_message_id = null;
        message.is_read = true;
        message.is_edited = false;
        message.is_deleted = false;
        message.created_at = now;
        message.updated_at = now;
        message.deleted_at = null;

        expect(message.id).toBe('msg-uuid');
        expect(message.content).toBe('Test message');
        expect(message.message_type).toBe(MessageType.TEXT);
        expect(message.sender_id).toBe('sender-uuid');
        expect(message.chat_id).toBe('chat-uuid');
        expect(message.reply_to_message_id).toBeNull();
        expect(message.is_read).toBe(true);
        expect(message.is_edited).toBe(false);
        expect(message.is_deleted).toBe(false);
        expect(message.created_at).toBe(now);
        expect(message.updated_at).toBe(now);
        expect(message.deleted_at).toBeNull();
    });
});

describe('MessageType Enum', () => {
    it('should have TEXT value', () => {
        expect(MessageType.TEXT).toBe('text');
    });

    it('should have REPLY value', () => {
        expect(MessageType.REPLY).toBe('reply');
    });

    it('should only have TEXT and REPLY types', () => {
        const types = Object.values(MessageType);
        expect(types).toHaveLength(2);
        expect(types).toContain('text');
        expect(types).toContain('reply');
    });
});

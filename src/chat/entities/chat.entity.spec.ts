import { Chat } from './chat.entity';
import { Message } from './message.entity';

describe('Chat Entity', () => {
    it('should create a chat entity instance', () => {
        const chat = new Chat();
        expect(chat).toBeDefined();
        expect(chat).toBeInstanceOf(Chat);
    });

    it('should have id property', () => {
        const chat = new Chat();
        chat.id = '123e4567-e89b-12d3-a456-426614174000';
        expect(chat.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should have user1_id property', () => {
        const chat = new Chat();
        chat.user1_id = 'user-1-uuid';
        expect(chat.user1_id).toBe('user-1-uuid');
    });

    it('should have user2_id property', () => {
        const chat = new Chat();
        chat.user2_id = 'user-2-uuid';
        expect(chat.user2_id).toBe('user-2-uuid');
    });

    it('should have messages property', () => {
        const chat = new Chat();
        const message = new Message();
        chat.messages = [message];
        expect(chat.messages).toHaveLength(1);
        expect(chat.messages[0]).toBeInstanceOf(Message);
    });

    it('should have created_at property', () => {
        const chat = new Chat();
        const now = new Date();
        chat.created_at = now;
        expect(chat.created_at).toBe(now);
    });

    it('should have updated_at property', () => {
        const chat = new Chat();
        const now = new Date();
        chat.updated_at = now;
        expect(chat.updated_at).toBe(now);
    });

    it('should initialize with empty messages array', () => {
        const chat = new Chat();
        chat.messages = [];
        expect(chat.messages).toEqual([]);
    });

    it('should allow setting all properties', () => {
        const chat = new Chat();
        const now = new Date();

        chat.id = 'chat-uuid';
        chat.user1_id = 'user1-uuid';
        chat.user2_id = 'user2-uuid';
        chat.messages = [];
        chat.created_at = now;
        chat.updated_at = now;

        expect(chat.id).toBe('chat-uuid');
        expect(chat.user1_id).toBe('user1-uuid');
        expect(chat.user2_id).toBe('user2-uuid');
        expect(chat.messages).toEqual([]);
        expect(chat.created_at).toBe(now);
        expect(chat.updated_at).toBe(now);
    });
});

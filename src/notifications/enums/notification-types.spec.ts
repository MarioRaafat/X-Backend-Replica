import { NotificationType } from './notification-types';

describe('NotificationType Enum', () => {
    it('should have LIKE value', () => {
        expect(NotificationType.LIKE).toBe('like');
    });

    it('should have REPLY value', () => {
        expect(NotificationType.REPLY).toBe('following');
    });

    it('should have REPOST value', () => {
        expect(NotificationType.REPOST).toBe('repost');
    });

    it('should have QUOTE value', () => {
        expect(NotificationType.QUOTE).toBe('quote');
    });

    it('should have FOLLOW value', () => {
        expect(NotificationType.FOLLOW).toBe('follow');
    });

    it('should have MENTION value', () => {
        expect(NotificationType.MENTION).toBe('mention');
    });

    it('should have SYSTEM value', () => {
        expect(NotificationType.SYSTEM).toBe('system');
    });

    it('should have exactly 7 notification types', () => {
        const types = Object.values(NotificationType);
        expect(types).toHaveLength(7);
    });

    it('should contain all expected types', () => {
        const types = Object.values(NotificationType);
        expect(types).toContain('like');
        expect(types).toContain('following');
        expect(types).toContain('repost');
        expect(types).toContain('quote');
        expect(types).toContain('follow');
        expect(types).toContain('mention');
        expect(types).toContain('system');
    });

    it('should be usable for type checking', () => {
        const notification_type: NotificationType = NotificationType.LIKE;
        expect(notification_type).toBe(NotificationType.LIKE);
        expect(notification_type).not.toBe(NotificationType.FOLLOW);
    });

    it('should be usable in conditional logic', () => {
        const type: NotificationType = NotificationType.MENTION;
        const interaction_types = [
            NotificationType.LIKE,
            NotificationType.REPLY,
            NotificationType.REPOST,
            NotificationType.QUOTE,
            NotificationType.MENTION,
        ];

        const is_interaction = interaction_types.includes(type);

        expect(is_interaction).toBe(true);
    });
});

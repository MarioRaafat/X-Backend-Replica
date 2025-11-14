import { NotificationTypes } from './notidication_types';

describe('NotificationTypes', () => {
    it('should be defined', () => {
        expect(NotificationTypes).toBeDefined();
    });

    it('should have LIKE type', () => {
        expect(NotificationTypes.LIKE).toBe('like');
    });

    it('should have COMMENT type', () => {
        expect(NotificationTypes.COMMENT).toBe('comment');
    });

    it('should have FOLLOW type', () => {
        expect(NotificationTypes.FOLLOW).toBe('follow');
    });

    it('should have MESSAGE type', () => {
        expect(NotificationTypes.MESSAGE).toBe('message');
    });

    it('should have exactly 4 notification types', () => {
        const types = Object.values(NotificationTypes);
        expect(types).toHaveLength(4);
    });

    it('should contain all expected notification types', () => {
        const types = Object.values(NotificationTypes);
        expect(types).toContain('like');
        expect(types).toContain('comment');
        expect(types).toContain('follow');
        expect(types).toContain('message');
    });

    it('should be accessible by enum key', () => {
        expect(NotificationTypes['LIKE']).toBe('like');
        expect(NotificationTypes['COMMENT']).toBe('comment');
        expect(NotificationTypes['FOLLOW']).toBe('follow');
        expect(NotificationTypes['MESSAGE']).toBe('message');
    });

    it('should have string values', () => {
        Object.values(NotificationTypes).forEach((value) => {
            expect(typeof value).toBe('string');
        });
    });
});

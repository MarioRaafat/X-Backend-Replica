import { UserLookupDto } from './user-lookup.dto';
import { UserListItemDto } from './user-list-item.dto';

describe('UserLookupDto', () => {
    it('should be defined', () => {
        expect(UserLookupDto).toBeDefined();
    });

    it('should create an instance', () => {
        const dto = new UserLookupDto();
        expect(dto).toBeInstanceOf(UserLookupDto);
    });

    it('should have identifier, success, and user properties', () => {
        const dto = new UserLookupDto();
        dto.identifier = 'test@example.com';
        dto.success = true;
        dto.user = null;

        expect(dto.identifier).toBe('test@example.com');
        expect(dto.success).toBe(true);
        expect(dto.user).toBeNull();
    });

    it('should accept UserListItemDto for user property when found', () => {
        const dto = new UserLookupDto();
        const mock_user = {
            user_id: '123',
            username: 'testuser',
            name: 'Test User',
            avatar_url: 'https://example.com/avatar.jpg',
            verified: false,
            followers: 10,
            following: 5,
        } as UserListItemDto;

        dto.identifier = 'testuser';
        dto.success = true;
        dto.user = mock_user;

        expect(dto.user).toEqual(mock_user);
    });

    it('should handle unsuccessful lookup', () => {
        const dto = new UserLookupDto();
        dto.identifier = 'nonexistent@example.com';
        dto.success = false;
        dto.user = null;

        expect(dto.success).toBe(false);
        expect(dto.user).toBeNull();
    });

    it('should handle successful lookup', () => {
        const dto = new UserLookupDto();
        const mock_user = {
            user_id: '456',
            username: 'founduser',
            name: 'Found User',
            avatar_url: 'https://example.com/found.jpg',
            verified: true,
            followers: 100,
            following: 50,
        } as UserListItemDto;

        dto.identifier = 'founduser';
        dto.success = true;
        dto.user = mock_user;

        expect(dto.success).toBe(true);
        expect(dto.user).not.toBeNull();
        expect(dto.user?.username).toBe('founduser');
    });
});

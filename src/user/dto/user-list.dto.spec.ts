import { UserListDto } from './user-list.dto';
import { UserListItemDto } from './user-list-item.dto';

describe('UserListDto', () => {
    it('should be defined', () => {
        expect(UserListDto).toBeDefined();
    });

    it('should create an instance', () => {
        const dto = new UserListDto();
        expect(dto).toBeInstanceOf(UserListDto);
    });

    it('should have users property', () => {
        const dto = new UserListDto();
        dto.users = [];
        expect(dto.users).toBeDefined();
        expect(Array.isArray(dto.users)).toBe(true);
    });

    it('should accept an array of UserListItemDto', () => {
        const dto = new UserListDto();
        const mock_user = {
            user_id: '123',
            username: 'testuser',
            name: 'Test User',
            avatar_url: 'https://example.com/avatar.jpg',
            verified: false,
            followers: 10,
            following: 5,
        } as UserListItemDto;

        dto.users = [mock_user];
        expect(dto.users).toHaveLength(1);
        expect(dto.users[0]).toEqual(mock_user);
    });

    it('should handle empty users array', () => {
        const dto = new UserListDto();
        dto.users = [];
        expect(dto.users).toHaveLength(0);
    });
});

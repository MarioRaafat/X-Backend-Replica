import { MutualFollowerDto } from './mutual-follower.dto';

describe('MutualFollowerDto', () => {
    it('should be defined', () => {
        expect(MutualFollowerDto).toBeDefined();
    });

    it('should create an instance', () => {
        const dto = new MutualFollowerDto();
        expect(dto).toBeInstanceOf(MutualFollowerDto);
    });

    it('should have name and avatar_url properties', () => {
        const dto = new MutualFollowerDto();
        dto.name = 'John Doe';
        dto.avatar_url = 'https://example.com/avatar.jpg';

        expect(dto.name).toBe('John Doe');
        expect(dto.avatar_url).toBe('https://example.com/avatar.jpg');
    });

    it('should handle complete mutual follower data', () => {
        const dto = new MutualFollowerDto();
        dto.name = 'Jane Smith';
        dto.avatar_url = 'https://storage.azure.com/avatars/jane.png';

        expect(dto.name).toBeTruthy();
        expect(dto.avatar_url).toContain('https://');
    });

    it('should handle users without avatar', () => {
        const dto = new MutualFollowerDto();
        dto.name = 'Anonymous User';
        dto.avatar_url = '';

        expect(dto.name).toBe('Anonymous User');
        expect(dto.avatar_url).toBe('');
    });
});

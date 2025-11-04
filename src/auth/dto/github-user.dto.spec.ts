import { GitHubUserDto } from './github-user.dto';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

describe('GitHubUserDto', () => {
    it('should be defined', () => {
        const dto = new GitHubUserDto();
        expect(dto).toBeDefined();
    });

    it('should validate a valid GitHub user DTO', async () => {
        const plain_object = {
            github_id: '12345678',
            email: 'test@example.com',
            first_name: 'John',
            last_name: 'Doe',
            avatar_url: 'https://example.com/avatar.jpg',
            username: 'johndoe',
        };

        const dto = plainToInstance(GitHubUserDto, plain_object);
        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
        expect(dto.github_id).toBe(plain_object.github_id);
        expect(dto.email).toBe(plain_object.email);
        expect(dto.first_name).toBe(plain_object.first_name);
        expect(dto.last_name).toBe(plain_object.last_name);
    });

    it('should fail validation with invalid email', async () => {
        const plain_object = {
            github_id: '12345678',
            email: 'not-an-email',
            first_name: 'John',
            last_name: 'Doe',
        };

        const dto = plainToInstance(GitHubUserDto, plain_object);
        const errors = await validate(dto);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('email');
    });

    it('should fail validation with missing required fields', async () => {
        const plain_object = {
            github_id: '12345678',
        };

        const dto = plainToInstance(GitHubUserDto, plain_object);
        const errors = await validate(dto);

        expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle optional fields', async () => {
        const plain_object = {
            github_id: '12345678',
            email: 'test@example.com',
            first_name: 'John',
            last_name: 'Doe',
        };

        const dto = plainToInstance(GitHubUserDto, plain_object);
        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
    });
});

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateUserDto } from './create-user.dto';

describe('CreateUserDto', () => {
    it('should be defined', () => {
        expect(CreateUserDto).toBeDefined();
    });

    it('should create an instance', () => {
        const dto = new CreateUserDto();
        expect(dto).toBeInstanceOf(CreateUserDto);
    });

    describe('validation', () => {
        it('should validate with all required fields', async () => {
            const dto = plainToInstance(CreateUserDto, {
                email: 'test@example.com',
                name: 'Test User',
                username: 'testuser',
                birth_date: '1990-01-01',
            });

            const errors = await validate(dto);
            expect(errors).toHaveLength(0);
        });

        it('should fail validation with invalid email', async () => {
            const dto = plainToInstance(CreateUserDto, {
                email: 'invalid-email',
                name: 'Test User',
                username: 'testuser',
                birth_date: '1990-01-01',
            });

            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].property).toBe('email');
        });

        it('should accept optional password', async () => {
            const dto = plainToInstance(CreateUserDto, {
                email: 'test@example.com',
                name: 'Test User',
                username: 'testuser',
                birth_date: '1990-01-01',
                password: 'SecurePass123!',
            });

            const errors = await validate(dto);
            expect(errors).toHaveLength(0);
            expect(dto.password).toBe('SecurePass123!');
        });

        it('should accept optional bio', async () => {
            const dto = plainToInstance(CreateUserDto, {
                email: 'test@example.com',
                name: 'Test User',
                username: 'testuser',
                birth_date: '1990-01-01',
                bio: 'This is my bio',
            });

            const errors = await validate(dto);
            expect(errors).toHaveLength(0);
            expect(dto.bio).toBe('This is my bio');
        });

        it('should accept optional phone_number', async () => {
            const dto = plainToInstance(CreateUserDto, {
                email: 'test@example.com',
                name: 'Test User',
                username: 'testuser',
                birth_date: '1990-01-01',
                phone_number: '+1234567890',
            });

            const errors = await validate(dto);
            expect(errors).toHaveLength(0);
            expect(dto.phone_number).toBe('+1234567890');
        });

        it('should accept optional avatar_url', async () => {
            const dto = plainToInstance(CreateUserDto, {
                email: 'test@example.com',
                name: 'Test User',
                username: 'testuser',
                birth_date: '1990-01-01',
                avatar_url: 'https://example.com/avatar.jpg',
            });

            const errors = await validate(dto);
            expect(errors).toHaveLength(0);
            expect(dto.avatar_url).toBe('https://example.com/avatar.jpg');
        });

        it('should accept optional cover_url', async () => {
            const dto = plainToInstance(CreateUserDto, {
                email: 'test@example.com',
                name: 'Test User',
                username: 'testuser',
                birth_date: '1990-01-01',
                cover_url: 'https://example.com/cover.jpg',
            });

            const errors = await validate(dto);
            expect(errors).toHaveLength(0);
            expect(dto.cover_url).toBe('https://example.com/cover.jpg');
        });

        it('should accept OAuth provider IDs', async () => {
            const dto = plainToInstance(CreateUserDto, {
                email: 'test@example.com',
                name: 'Test User',
                username: 'testuser',
                birth_date: '1990-01-01',
                google_id: 'google123',
                facebook_id: 'facebook456',
                github_id: 'github789',
            });

            const errors = await validate(dto);
            expect(errors).toHaveLength(0);
            expect(dto.google_id).toBe('google123');
            expect(dto.facebook_id).toBe('facebook456');
            expect(dto.github_id).toBe('github789');
        });

        it('should fail validation with bio exceeding max length', async () => {
            const dto = plainToInstance(CreateUserDto, {
                email: 'test@example.com',
                name: 'Test User',
                username: 'testuser',
                birth_date: '1990-01-01',
                bio: 'a'.repeat(501),
            });

            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
            const bio_error = errors.find((e) => e.property === 'bio');
            expect(bio_error).toBeDefined();
        });

        it('should fail validation with phone_number exceeding max length', async () => {
            const dto = plainToInstance(CreateUserDto, {
                email: 'test@example.com',
                name: 'Test User',
                username: 'testuser',
                birth_date: '1990-01-01',
                phone_number: '+' + '1'.repeat(21),
            });

            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
            const phone_error = errors.find((e) => e.property === 'phone_number');
            expect(phone_error).toBeDefined();
        });
    });
});

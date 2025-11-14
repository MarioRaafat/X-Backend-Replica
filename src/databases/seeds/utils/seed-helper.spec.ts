import { SeedHelper } from './seed-helper';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('SeedHelper', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('insertBatch', () => {
        it('should be defined', () => {
            expect(SeedHelper.insertBatch).toBeDefined();
        });

        it('should insert entities in batches', async () => {
            const mock_repository = {
                save: jest.fn().mockImplementation((entities) => Promise.resolve(entities)),
            } as any as Repository<any>;

            const entities = Array.from({ length: 10 }, (_, i) => ({ id: i }));
            const console_spy = jest.spyOn(console, 'log').mockImplementation();

            const result = await SeedHelper.insertBatch(mock_repository, entities, 5);

            expect(result).toHaveLength(10);
            expect(mock_repository.save).toHaveBeenCalledTimes(2);

            console_spy.mockRestore();
        });

        it('should handle empty array', async () => {
            const mock_repository = {
                save: jest.fn(),
            } as any as Repository<any>;

            const result = await SeedHelper.insertBatch(mock_repository, []);

            expect(result).toHaveLength(0);
            expect(mock_repository.save).not.toHaveBeenCalled();
        });

        it('should use default batch size', async () => {
            const mock_repository = {
                save: jest.fn().mockImplementation((entities) => Promise.resolve(entities)),
            } as any as Repository<any>;

            const entities = Array.from({ length: 1000 }, (_, i) => ({ id: i }));
            const console_spy = jest.spyOn(console, 'log').mockImplementation();

            await SeedHelper.insertBatch(mock_repository, entities);

            expect(mock_repository.save).toHaveBeenCalled();

            console_spy.mockRestore();
        });
    });

    describe('removeDuplicates', () => {
        it('should be defined', () => {
            expect(SeedHelper.removeDuplicates).toBeDefined();
        });

        it('should remove duplicate items', () => {
            const items = [
                { id: 1, username: 'user1' },
                { id: 2, username: 'USER1' },
                { id: 3, username: 'user2' },
            ];

            const result = SeedHelper.removeDuplicates(items, (item) => item.username);

            expect(result).toHaveLength(2);
        });

        it('should handle empty array', () => {
            const result = SeedHelper.removeDuplicates([], (item) => item);

            expect(result).toHaveLength(0);
        });

        it('should skip items with null/undefined keys', () => {
            const items = [
                { id: 1, username: 'user1' },
                { id: 2, username: null },
                { id: 3, username: undefined },
                { id: 4, username: 'user2' },
            ];

            const result = SeedHelper.removeDuplicates(items, (item) => item.username as string);

            expect(result).toHaveLength(2);
        });

        it('should be case-insensitive', () => {
            const items = [{ username: 'Mario' }, { username: 'MARIO' }, { username: 'mario' }];

            const result = SeedHelper.removeDuplicates(items, (item) => item.username);

            expect(result).toHaveLength(1);
        });
    });

    describe('hashPassword', () => {
        it('should be defined', () => {
            expect(SeedHelper.hashPassword).toBeDefined();
        });

        it('should hash password successfully', async () => {
            process.env.DEFAULT_PASSWORD = 'testpassword';
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

            const result = await SeedHelper.hashPassword();

            expect(result).toBe('hashed_password');
            expect(bcrypt.hash).toHaveBeenCalledWith('testpassword', 10);
        });

        it('should throw error when DEFAULT_PASSWORD is not defined', async () => {
            delete process.env.DEFAULT_PASSWORD;

            await expect(SeedHelper.hashPassword()).rejects.toThrow();
        });
    });

    describe('generateEmail', () => {
        it('should be defined', () => {
            expect(SeedHelper.generateEmail).toBeDefined();
        });

        it('should generate email from username', () => {
            const email = SeedHelper.generateEmail('TestUser');

            expect(email).toBe('testuser@KingMario.com');
        });

        it('should handle lowercase username', () => {
            const email = SeedHelper.generateEmail('mario');

            expect(email).toBe('mario@KingMario.com');
        });

        it('should handle with topic parameter', () => {
            const email = SeedHelper.generateEmail('user1', 'music');

            expect(email).toContain('@KingMario.com');
            expect(email).toContain('user1');
        });
    });

    describe('generateBirthDate', () => {
        it('should be defined', () => {
            expect(SeedHelper.generateBirthDate).toBeDefined();
        });

        it('should generate a valid date', () => {
            const birth_date = SeedHelper.generateBirthDate();

            expect(birth_date).toBeInstanceOf(Date);
            expect(birth_date.getTime()).toBeLessThan(Date.now());
        });

        it('should generate date within age range', () => {
            const birth_date = SeedHelper.generateBirthDate();
            const today = new Date();
            const age = today.getFullYear() - birth_date.getFullYear();

            expect(age).toBeGreaterThanOrEqual(18);
            expect(age).toBeLessThanOrEqual(65);
        });
    });

    describe('parseInt', () => {
        it('should be defined', () => {
            expect(SeedHelper.parseInt).toBeDefined();
        });

        it('should parse valid integer', () => {
            expect(SeedHelper.parseInt('123')).toBe(123);
            expect(SeedHelper.parseInt(456)).toBe(456);
        });

        it('should return default value for invalid input', () => {
            expect(SeedHelper.parseInt('invalid')).toBe(0);
            expect(SeedHelper.parseInt(null)).toBe(0);
            expect(SeedHelper.parseInt(undefined)).toBe(0);
        });

        it('should use custom default value', () => {
            expect(SeedHelper.parseInt('invalid', 99)).toBe(99);
        });
    });

    describe('parseDate', () => {
        it('should be defined', () => {
            expect(SeedHelper.parseDate).toBeDefined();
        });

        it('should parse string date', () => {
            const result = SeedHelper.parseDate('2023-01-01');

            expect(result).toBeInstanceOf(Date);
        });

        it('should parse Excel numeric date', () => {
            const excel_date = 44927; // Some date in Excel format
            const result = SeedHelper.parseDate(excel_date);

            expect(result).toBeInstanceOf(Date);
        });

        it('should handle date with "at" keyword', () => {
            const result = SeedHelper.parseDate('May 6, 2017 at 07:04 PM');

            expect(result).toBeInstanceOf(Date);
        });

        it('should return null for invalid date', () => {
            expect(SeedHelper.parseDate('invalid date')).toBeNull();
        });

        it('should return null for null/undefined input', () => {
            expect(SeedHelper.parseDate(null)).toBeNull();
            expect(SeedHelper.parseDate(undefined)).toBeNull();
        });
    });

    describe('parseMedia', () => {
        it('should be defined', () => {
            expect(SeedHelper.parseMedia).toBeDefined();
        });

        it('should parse empty media', () => {
            const result = SeedHelper.parseMedia(null);

            expect(result.images).toEqual([]);
            expect(result.videos).toEqual([]);
        });

        it('should parse stringified JSON array', () => {
            const media = '[{"url":"https://example.com/image.jpg"}]';
            const result = SeedHelper.parseMedia(media);

            expect(result.images).toContain('https://example.com/image.jpg');
        });

        it('should parse array of objects', () => {
            const media = [
                { url: 'https://example.com/image.png' },
                { url: 'https://example.com/video.mp4' },
            ];
            const result = SeedHelper.parseMedia(media);

            expect(result.images).toContain('https://example.com/image.png');
            expect(result.videos).toContain('https://example.com/video.mp4');
        });

        it('should parse object with images and videos properties', () => {
            const media = {
                images: ['https://example.com/pic.jpg'],
                videos: ['https://example.com/clip.mp4'],
            };
            const result = SeedHelper.parseMedia(media);

            expect(result.images).toEqual(['https://example.com/pic.jpg']);
            expect(result.videos).toEqual(['https://example.com/clip.mp4']);
        });

        it('should parse comma-separated URLs', () => {
            const media = 'https://example.com/image.jpg, https://example.com/video.mp4';
            const result = SeedHelper.parseMedia(media);

            expect(result.images.length + result.videos.length).toBeGreaterThan(0);
        });

        it('should parse single image URL', () => {
            const media = 'https://example.com/single.jpg';
            const result = SeedHelper.parseMedia(media);

            expect(result.images).toContain('https://example.com/single.jpg');
        });

        it('should parse single video URL', () => {
            const media = 'https://example.com/video.mp4';
            const result = SeedHelper.parseMedia(media);

            expect(result.videos).toContain('https://example.com/video.mp4');
        });

        it('should handle YouTube URLs', () => {
            const media = 'https://www.youtube.com/watch?v=12345';
            const result = SeedHelper.parseMedia(media);

            expect(result.videos).toContain('https://www.youtube.com/watch?v=12345');
        });

        it('should handle parse errors gracefully', () => {
            const console_warn_spy = jest.spyOn(console, 'warn').mockImplementation();

            const result = SeedHelper.parseMedia('invalid json [');

            expect(result.images).toEqual([]);
            expect(result.videos).toEqual([]);

            console_warn_spy.mockRestore();
        });
    });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ExploreService } from './explore.service';

describe('ExploreService', () => {
    let service: ExploreService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ExploreService],
        }).compile();

        service = module.get<ExploreService>(ExploreService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('root', () => {
        it('should return explore endpoint message', async () => {
            const result = await service.root();

            expect(result).toEqual({ message: 'Explore endpoint' });
        });

        it('should return an object with message property', async () => {
            const result = await service.root();

            expect(result).toHaveProperty('message');
            expect(typeof result.message).toBe('string');
        });
    });

    describe('getTrending', () => {
        it('should be callable without parameters', async () => {
            const result = await service.getTrending();

            expect(result).toBeUndefined();
        });

        it('should be callable with category parameter', async () => {
            const result = await service.getTrending('technology');

            expect(result).toBeUndefined();
        });

        it('should be callable with category and country parameters', async () => {
            const result = await service.getTrending('sports', 'US');

            expect(result).toBeUndefined();
        });

        it('should handle empty string category', async () => {
            const result = await service.getTrending('');

            expect(result).toBeUndefined();
        });

        it('should handle empty string country', async () => {
            const result = await service.getTrending('technology', '');

            expect(result).toBeUndefined();
        });
    });

    describe('getWhoToFollow', () => {
        it('should be callable', async () => {
            const result = await service.getWhoToFollow();

            expect(result).toBeUndefined();
        });

        it('should return a promise', () => {
            const result = service.getWhoToFollow();

            expect(result).toBeInstanceOf(Promise);
        });
    });

    describe('getForYouPosts', () => {
        it('should be callable without parameters', async () => {
            const result = await service.getForYouPosts();

            expect(result).toBeUndefined();
        });

        it('should be callable with category parameter', async () => {
            const result = await service.getForYouPosts('sports');

            expect(result).toBeUndefined();
        });

        it('should handle empty string category', async () => {
            const result = await service.getForYouPosts('');

            expect(result).toBeUndefined();
        });

        it('should handle null category', async () => {
            const result = await service.getForYouPosts(undefined);

            expect(result).toBeUndefined();
        });
    });
});

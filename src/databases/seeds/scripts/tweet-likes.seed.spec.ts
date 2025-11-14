import { TweetLikesSeeder } from './tweet-likes.seed';

describe('TweetLikesSeeder', () => {
    let seeder: TweetLikesSeeder;

    beforeEach(() => {
        seeder = new TweetLikesSeeder();
    });

    describe('constructor', () => {
        it('should create an instance of TweetLikesSeeder', () => {
            expect(seeder).toBeInstanceOf(TweetLikesSeeder);
        });
    });

    describe('getName', () => {
        it('should return the name of the seeder', () => {
            expect(seeder.getName()).toBe('TweetLikesSeeder');
        });
    });

    describe('seed', () => {
        it('should be defined', () => {
            expect(seeder.seed).toBeDefined();
        });

        it('should be a function', () => {
            expect(typeof seeder.seed).toBe('function');
        });
    });

    describe('getRandomUsers', () => {
        it('should be defined', () => {
            expect((seeder as any).getRandomUsers).toBeDefined();
        });
    });
});

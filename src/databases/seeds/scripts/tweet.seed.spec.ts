import { TweetSeeder } from './tweet.seed';

describe('TweetSeeder', () => {
    let seeder: TweetSeeder;

    beforeEach(() => {
        seeder = new TweetSeeder();
    });

    describe('constructor', () => {
        it('should create an instance of TweetSeeder', () => {
            expect(seeder).toBeInstanceOf(TweetSeeder);
        });
    });

    describe('getName', () => {
        it('should return the name of the seeder', () => {
            expect(seeder.getName()).toBe('TweetSeeder');
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

    describe('transformTweets', () => {
        it('should be defined', () => {
            expect((seeder as any).transformTweets).toBeDefined();
        });
    });
});

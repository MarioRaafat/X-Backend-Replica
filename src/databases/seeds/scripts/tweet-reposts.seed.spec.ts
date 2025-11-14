import { TweetRepostsSeeder } from './tweet-reposts.seed';

describe('TweetRepostsSeeder', () => {
    let seeder: TweetRepostsSeeder;

    beforeEach(() => {
        seeder = new TweetRepostsSeeder();
    });

    describe('constructor', () => {
        it('should create an instance of TweetRepostsSeeder', () => {
            expect(seeder).toBeInstanceOf(TweetRepostsSeeder);
        });
    });

    describe('getName', () => {
        it('should return the name of the seeder', () => {
            expect(seeder.getName()).toBe('TweetRepostsSeeder');
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

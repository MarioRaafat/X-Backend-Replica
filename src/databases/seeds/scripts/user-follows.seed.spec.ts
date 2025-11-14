import { UserFollowsSeeder } from './user-follows.seed';

describe('UserFollowsSeeder', () => {
    let seeder: UserFollowsSeeder;

    beforeEach(() => {
        seeder = new UserFollowsSeeder();
    });

    describe('constructor', () => {
        it('should create an instance of UserFollowsSeeder', () => {
            expect(seeder).toBeInstanceOf(UserFollowsSeeder);
        });
    });

    describe('getName', () => {
        it('should return the name of the seeder', () => {
            expect(seeder.getName()).toBe('UserFollowsSeeder');
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

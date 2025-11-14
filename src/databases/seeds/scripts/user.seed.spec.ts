import { UserSeeder } from './user.seed';

describe('UserSeeder', () => {
    let seeder: UserSeeder;

    beforeEach(() => {
        seeder = new UserSeeder();
    });

    describe('constructor', () => {
        it('should create an instance of UserSeeder', () => {
            expect(seeder).toBeInstanceOf(UserSeeder);
        });
    });

    describe('getName', () => {
        it('should return the name of the seeder', () => {
            expect(seeder.getName()).toBe('UserSeeder');
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

    describe('transformUsers', () => {
        it('should be defined', () => {
            expect((seeder as any).transformUsers).toBeDefined();
        });
    });
});

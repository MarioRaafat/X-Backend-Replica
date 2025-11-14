import { ReplySeeder } from './reply.seed';

describe('ReplySeeder', () => {
    let seeder: ReplySeeder;

    beforeEach(() => {
        seeder = new ReplySeeder();
    });

    describe('constructor', () => {
        it('should create an instance of ReplySeeder', () => {
            expect(seeder).toBeInstanceOf(ReplySeeder);
        });
    });

    describe('getName', () => {
        it('should return the name of the seeder', () => {
            expect(seeder.getName()).toBe('ReplySeeder');
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

    describe('transformReplies', () => {
        it('should be defined', () => {
            expect((seeder as any).transformReplies).toBeDefined();
        });
    });
});

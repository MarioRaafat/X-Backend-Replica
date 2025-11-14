import { BaseSeeder, ISeeder, ISeederContext } from './seeder.interface';
import { DataSource } from 'typeorm';

class TestSeeder extends BaseSeeder {
    getName(): string {
        return 'TestSeeder';
    }

    async seed(context: ISeederContext): Promise<void> {
        this.log('Test log message');
        this.logSuccess('Test success message');
        this.logWarning('Test warning message');
        this.logError('Test error message');
    }
}

describe('seeder.interface', () => {
    let seeder: TestSeeder;
    let mock_context: ISeederContext;

    beforeEach(() => {
        seeder = new TestSeeder();
        mock_context = {
            data_source: {} as DataSource,
            topic_name: 'test',
            data: {
                users: [],
                tweets: [],
                replies: [],
            },
        };
    });

    describe('ISeederContext', () => {
        it('should have correct structure', () => {
            expect(mock_context.data_source).toBeDefined();
            expect(mock_context.topic_name).toBe('test');
            expect(mock_context.data).toBeDefined();
            expect(mock_context.data.users).toBeInstanceOf(Array);
            expect(mock_context.data.tweets).toBeInstanceOf(Array);
            expect(mock_context.data.replies).toBeInstanceOf(Array);
        });

        it('should allow optional results property', () => {
            mock_context.results = {
                categories: [],
                users: [],
                tweets: [],
                replies: [],
                user_id_map: new Map(),
                tweet_id_map: new Map(),
            };

            expect(mock_context.results).toBeDefined();
            expect(mock_context.results.categories).toBeInstanceOf(Array);
            expect(mock_context.results.user_id_map).toBeInstanceOf(Map);
        });
    });

    describe('ISeeder', () => {
        it('should define required methods', () => {
            expect(seeder.seed).toBeDefined();
            expect(seeder.getName).toBeDefined();
            expect(typeof seeder.seed).toBe('function');
            expect(typeof seeder.getName).toBe('function');
        });
    });

    describe('BaseSeeder', () => {
        it('should be defined', () => {
            expect(seeder).toBeDefined();
            expect(seeder).toBeInstanceOf(BaseSeeder);
        });

        it('should implement ISeeder interface', () => {
            expect(seeder.getName).toBeDefined();
            expect(seeder.seed).toBeDefined();
        });

        it('should have getName method', () => {
            expect(seeder.getName()).toBe('TestSeeder');
        });

        it('should have seed method', async () => {
            await expect(seeder.seed(mock_context)).resolves.not.toThrow();
        });

        it('should have log methods', () => {
            const console_spy = jest.spyOn(console, 'log').mockImplementation();
            const console_warn_spy = jest.spyOn(console, 'warn').mockImplementation();
            const console_error_spy = jest.spyOn(console, 'error').mockImplementation();

            seeder['log']('test');
            seeder['logSuccess']('success');
            seeder['logWarning']('warning');
            seeder['logError']('error');

            expect(console_spy).toHaveBeenCalled();
            expect(console_warn_spy).toHaveBeenCalled();
            expect(console_error_spy).toHaveBeenCalled();

            console_spy.mockRestore();
            console_warn_spy.mockRestore();
            console_error_spy.mockRestore();
        });

        it('should format log messages correctly', () => {
            const console_spy = jest.spyOn(console, 'log').mockImplementation();

            seeder['log']('Test message');
            expect(console_spy).toHaveBeenCalledWith('   Test message');

            seeder['logSuccess']('Success message');
            expect(console_spy).toHaveBeenCalledWith('   ✅ Success message');

            console_spy.mockRestore();
        });

        it('should format warning messages correctly', () => {
            const console_warn_spy = jest.spyOn(console, 'warn').mockImplementation();

            seeder['logWarning']('Warning message');
            expect(console_warn_spy).toHaveBeenCalledWith('   ⚠️  Warning message');

            console_warn_spy.mockRestore();
        });

        it('should format error messages correctly', () => {
            const console_error_spy = jest.spyOn(console, 'error').mockImplementation();

            seeder['logError']('Error message');
            expect(console_error_spy).toHaveBeenCalledWith('   ❌ Error message');

            console_error_spy.mockRestore();
        });
    });
});

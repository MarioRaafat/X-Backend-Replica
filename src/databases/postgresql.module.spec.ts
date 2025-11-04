import { PostgreSQLModule } from './postgresql.module';

describe('PostgreSQLModule', () => {
    it('should be defined', () => {
        expect(PostgreSQLModule).toBeDefined();
    });

    it('should be a class', () => {
        expect(typeof PostgreSQLModule).toBe('function');
    });

    it('should have module decorator metadata', () => {
        const module_metadata =
            Reflect.getMetadata('imports', PostgreSQLModule) ||
            Reflect.getMetadata('providers', PostgreSQLModule);

        expect(module_metadata).toBeDefined();
    });
});

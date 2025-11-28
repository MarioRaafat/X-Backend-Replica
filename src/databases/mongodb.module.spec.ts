import { MongodbModule } from './mongodb.module';

describe('MongodbModule', () => {
    it('should be defined', () => {
        expect(MongodbModule).toBeDefined();
    });

    it('should be a class', () => {
        expect(typeof MongodbModule).toBe('function');
    });

    it('should have module decorator metadata', () => {
        const module_metadata = Reflect.getMetadata('imports', MongodbModule);

        expect(module_metadata).toBeDefined();
    });
});

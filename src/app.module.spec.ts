import { AppModule } from './app.module';
import { MiddlewareConsumer } from '@nestjs/common';

describe('AppModule', () => {
    it('should be defined', () => {
        expect(AppModule).toBeDefined();
    });

    it('should be a class', () => {
        expect(typeof AppModule).toBe('function');
    });

    it('should have module decorator metadata', () => {
        const imports = Reflect.getMetadata('imports', AppModule);
        expect(imports).toBeDefined();
        expect(Array.isArray(imports)).toBe(true);
        expect(imports.length).toBeGreaterThan(0);
    });

    it('should have controllers metadata', () => {
        const controllers = Reflect.getMetadata('controllers', AppModule);
        expect(controllers).toBeDefined();
        expect(Array.isArray(controllers)).toBe(true);
    });

    it('should have providers metadata', () => {
        const providers = Reflect.getMetadata('providers', AppModule);
        expect(providers).toBeDefined();
        expect(Array.isArray(providers)).toBe(true);
    });

    describe('configure', () => {
        it('should have configure method for middleware', () => {
            const app_module = new AppModule();
            expect(app_module.configure).toBeDefined();
            expect(typeof app_module.configure).toBe('function');
        });

        it('should call consumer.apply in configure method', () => {
            const app_module = new AppModule();
            const mock_consumer = {
                apply: jest.fn().mockReturnThis(),
                forRoutes: jest.fn().mockReturnThis(),
            } as unknown as MiddlewareConsumer;

            app_module.configure(mock_consumer);

            expect(mock_consumer.apply).toHaveBeenCalled();
            // expect(mock_consumer.forRoutes).toHaveBeenCalledWith('*');
        });
    });
});

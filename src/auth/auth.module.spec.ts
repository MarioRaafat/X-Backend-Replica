import { AuthModule } from './auth.module';

describe('AuthModule', () => {
    it('should be defined', () => {
        expect(AuthModule).toBeDefined();
    });

    it('should be a class', () => {
        expect(typeof AuthModule).toBe('function');
    });

    it('should have module decorator with imports metadata', () => {
        const imports = Reflect.getMetadata('imports', AuthModule);
        expect(imports).toBeDefined();
        expect(Array.isArray(imports)).toBe(true);
        expect(imports.length).toBeGreaterThan(0);
    });

    it('should have controllers metadata', () => {
        const controllers = Reflect.getMetadata('controllers', AuthModule);
        expect(controllers).toBeDefined();
        expect(Array.isArray(controllers)).toBe(true);
        expect(controllers.length).toBeGreaterThan(0);
    });

    it('should have providers metadata', () => {
        const providers = Reflect.getMetadata('providers', AuthModule);
        expect(providers).toBeDefined();
        expect(Array.isArray(providers)).toBe(true);
        expect(providers.length).toBeGreaterThan(0);
    });
});

import { ChatModule } from './chat.module';

describe('ChatModule', () => {
    it('should be defined', () => {
        expect(ChatModule).toBeDefined();
    });

    it('should be a class', () => {
        expect(typeof ChatModule).toBe('function');
    });

    it('should have module decorator metadata', () => {
        const module_metadata =
            Reflect.getMetadata('imports', ChatModule) ||
            Reflect.getMetadata('controllers', ChatModule) ||
            Reflect.getMetadata('providers', ChatModule);

        expect(module_metadata).toBeDefined();
    });
});

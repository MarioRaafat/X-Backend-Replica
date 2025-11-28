import { AzureStorageModule } from './azure-storage.module';
import { ConfigModule } from '@nestjs/config';
import { AzureStorageService } from './azure-storage.service';

describe('AzureStorageModule', () => {
    it('should be defined', () => {
        expect(AzureStorageModule).toBeDefined();
    });

    it('should have ConfigModule in imports', () => {
        const imports = Reflect.getMetadata('imports', AzureStorageModule);
        expect(imports).toContain(ConfigModule);
    });

    it('should have AzureStorageService in providers', () => {
        const providers = Reflect.getMetadata('providers', AzureStorageModule);
        expect(providers).toContain(AzureStorageService);
    });

    it('should export AzureStorageService', () => {
        const exports = Reflect.getMetadata('exports', AzureStorageModule);
        expect(exports).toContain(AzureStorageService);
    });

    it('should have correct number of imports', () => {
        const imports = Reflect.getMetadata('imports', AzureStorageModule);
        expect(imports).toHaveLength(1);
    });

    it('should have correct number of providers', () => {
        const providers = Reflect.getMetadata('providers', AzureStorageModule);
        expect(providers).toHaveLength(1);
    });

    it('should have correct number of exports', () => {
        const exports = Reflect.getMetadata('exports', AzureStorageModule);
        expect(exports).toHaveLength(1);
    });
});

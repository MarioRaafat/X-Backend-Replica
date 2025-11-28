import { CategoryModule } from './category.module';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './entities';

describe('CategoryModule', () => {
    it('should be defined', () => {
        expect(CategoryModule).toBeDefined();
    });

    it('should have TypeOrmModule in imports', () => {
        const imports = Reflect.getMetadata('imports', CategoryModule);
        expect(imports).toBeDefined();
        expect(imports.length).toBeGreaterThan(0);
    });

    it('should have CategoryController in controllers', () => {
        const controllers = Reflect.getMetadata('controllers', CategoryModule);
        expect(controllers).toContain(CategoryController);
    });

    it('should have CategoryService in providers', () => {
        const providers = Reflect.getMetadata('providers', CategoryModule);
        expect(providers).toContain(CategoryService);
    });

    it('should export TypeOrmModule', () => {
        const exports = Reflect.getMetadata('exports', CategoryModule);
        expect(exports).toContain(TypeOrmModule);
    });

    it('should have correct number of controllers', () => {
        const controllers = Reflect.getMetadata('controllers', CategoryModule);
        expect(controllers).toHaveLength(1);
    });

    it('should have correct number of providers', () => {
        const providers = Reflect.getMetadata('providers', CategoryModule);
        expect(providers).toHaveLength(1);
    });

    it('should have correct number of exports', () => {
        const exports = Reflect.getMetadata('exports', CategoryModule);
        expect(exports).toHaveLength(1);
    });
});

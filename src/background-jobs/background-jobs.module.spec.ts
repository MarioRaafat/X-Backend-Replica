import { BackgroundJobsModule } from './background-jobs.module';

describe('BackgroundJobsModule', () => {
    it('should be defined', () => {
        expect(BackgroundJobsModule).toBeDefined();
    });

    it('should be a class', () => {
        expect(typeof BackgroundJobsModule).toBe('function');
    });

    it('should have module metadata', () => {
        const module_metadata =
            Reflect.getMetadata('imports', BackgroundJobsModule) ||
            Reflect.getMetadata('controllers', BackgroundJobsModule) ||
            Reflect.getMetadata('providers', BackgroundJobsModule);

        expect(module_metadata).toBeDefined();
    });
});

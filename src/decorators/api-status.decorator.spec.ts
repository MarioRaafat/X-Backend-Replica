import { ApiImplementationStatus, ImplementationStatus } from './api-status.decorator';
import { Reflector } from '@nestjs/core';

describe('ApiImplementationStatus Decorator', () => {
    let reflector: Reflector;

    beforeEach(() => {
        reflector = new Reflector();
    });

    it('should create decorator with IMPLEMENTED status', () => {
        const decorator = ApiImplementationStatus({
            status: ImplementationStatus.IMPLEMENTED,
            summary: 'Get user profile',
        });

        expect(decorator).toBeDefined();
    });

    it('should create decorator with IN_PROGRESS status', () => {
        const decorator = ApiImplementationStatus({
            status: ImplementationStatus.IN_PROGRESS,
            summary: 'Update user settings',
            notes: 'Working on validation',
        });

        expect(decorator).toBeDefined();
    });

    it('should create decorator with NOT_IMPLEMENTED status', () => {
        const decorator = ApiImplementationStatus({
            status: ImplementationStatus.NOT_IMPLEMENTED,
            summary: 'Advanced search',
            expectedDate: '2024-12-31',
        });

        expect(decorator).toBeDefined();
    });

    it('should handle all options', () => {
        const decorator = ApiImplementationStatus({
            status: ImplementationStatus.IN_PROGRESS,
            summary: 'Test endpoint',
            notes: 'Some notes',
            expectedDate: '2024-12-01',
        });

        expect(decorator).toBeDefined();
    });

    it('should be applicable to controller methods', () => {
        class TestController {
            @ApiImplementationStatus({
                status: ImplementationStatus.IMPLEMENTED,
                summary: 'Test method',
            })
            testMethod(): string {
                return 'test';
            }
        }

        expect(TestController.prototype.testMethod).toBeDefined();
    });
});

describe('ImplementationStatus Enum', () => {
    it('should have IMPLEMENTED value', () => {
        expect(ImplementationStatus.IMPLEMENTED).toBe('implemented');
    });

    it('should have IN_PROGRESS value', () => {
        expect(ImplementationStatus.IN_PROGRESS).toBe('in-progress');
    });

    it('should have NOT_IMPLEMENTED value', () => {
        expect(ImplementationStatus.NOT_IMPLEMENTED).toBe('not-implemented');
    });

    it('should have exactly 3 statuses', () => {
        const statuses = Object.values(ImplementationStatus);
        expect(statuses).toHaveLength(3);
    });
});

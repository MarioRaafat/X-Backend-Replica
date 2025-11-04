import { IS_PUBLIC_KEY, Public } from './public.decorator';
import { Reflector } from '@nestjs/core';

describe('Public Decorator', () => {
    let reflector: Reflector;

    beforeEach(() => {
        reflector = new Reflector();
    });

    it('should set isPublic metadata to true', () => {
        class TestClass {
            @Public()
            testMethod(): void {
                // Test method
            }
        }

        const is_public = reflector.get<boolean>(IS_PUBLIC_KEY, TestClass.prototype.testMethod);
        expect(is_public).toBe(true);
    });

    it('should have correct metadata key', () => {
        expect(IS_PUBLIC_KEY).toBe('isPublic');
    });

    it('should be applicable to methods', () => {
        class TestController {
            @Public()
            publicEndpoint(): string {
                return 'public';
            }
        }

        const is_public = reflector.get<boolean>(
            IS_PUBLIC_KEY,
            TestController.prototype.publicEndpoint
        );
        expect(is_public).toBe(true);
    });

    it('should not affect methods without decorator', () => {
        class TestController {
            privateEndpoint(): string {
                return 'private';
            }
        }

        const is_public = reflector.get<boolean>(
            IS_PUBLIC_KEY,
            TestController.prototype.privateEndpoint
        );
        expect(is_public).toBeUndefined();
    });
});

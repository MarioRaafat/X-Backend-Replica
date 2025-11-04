import { RESPONSE_MESSAGE_KEY, ResponseMessage } from './response-message.decorator';
import { Reflector } from '@nestjs/core';

describe('ResponseMessage Decorator', () => {
    let reflector: Reflector;

    beforeEach(() => {
        reflector = new Reflector();
    });

    it('should set response message metadata', () => {
        const test_message = 'Operation successful';

        class TestClass {
            @ResponseMessage(test_message)
            testMethod(): void {
                // Test method
            }
        }

        const message = reflector.get<string>(RESPONSE_MESSAGE_KEY, TestClass.prototype.testMethod);
        expect(message).toBe(test_message);
    });

    it('should have correct metadata key', () => {
        expect(RESPONSE_MESSAGE_KEY).toBe('RESPONSE_MESSAGE');
    });

    it('should support different message values', () => {
        const message1 = 'User created successfully';
        const message2 = 'User deleted successfully';

        class TestController {
            @ResponseMessage(message1)
            createUser(): void {
                // Create user
            }

            @ResponseMessage(message2)
            deleteUser(): void {
                // Delete user
            }
        }

        const create_message = reflector.get<string>(
            RESPONSE_MESSAGE_KEY,
            TestController.prototype.createUser
        );
        const delete_message = reflector.get<string>(
            RESPONSE_MESSAGE_KEY,
            TestController.prototype.deleteUser
        );

        expect(create_message).toBe(message1);
        expect(delete_message).toBe(message2);
    });

    it('should not affect methods without decorator', () => {
        class TestController {
            normalMethod(): string {
                return 'no message';
            }
        }

        const message = reflector.get<string>(
            RESPONSE_MESSAGE_KEY,
            TestController.prototype.normalMethod
        );
        expect(message).toBeUndefined();
    });

    it('should handle empty string message', () => {
        const empty_message = '';

        class TestClass {
            @ResponseMessage(empty_message)
            testMethod(): void {
                // Test method
            }
        }

        const message = reflector.get<string>(RESPONSE_MESSAGE_KEY, TestClass.prototype.testMethod);
        expect(message).toBe(empty_message);
    });
});

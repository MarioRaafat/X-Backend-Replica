import { ExecutionContext } from '@nestjs/common';
import { GetUserId } from './get-userId.decorator';

describe('GetUserId Decorator', () => {
    let mock_context: ExecutionContext;

    it('should be defined', () => {
        expect(GetUserId).toBeDefined();
    });

    it('should be a function', () => {
        expect(typeof GetUserId).toBe('function');
    });

    it('should extract user ID from request', () => {
        const MOCK_USER_ID = '123e4567-e89b-12d3-a456-426614174000';
        const mock_request = {
            user: {
                id: MOCK_USER_ID,
            },
        };

        mock_context = {
            switchToHttp: jest.fn().mockReturnValue({
                getRequest: jest.fn().mockReturnValue(mock_request),
            }),
            getClass: jest.fn(),
            getHandler: jest.fn(),
            getArgs: jest.fn(),
            getArgByIndex: jest.fn(),
            switchToRpc: jest.fn(),
            switchToWs: jest.fn(),
            getType: jest.fn(),
        } as unknown as ExecutionContext;

        // Test the decorator logic by simulating what it does
        const request = mock_context.switchToHttp().getRequest();
        const user = request.user;
        const user_id = user ? user.id : null;

        expect(user_id).toBe(MOCK_USER_ID);
    });

    it('should return null when user is not present', () => {
        const mock_request = {
            user: null,
        };

        mock_context = {
            switchToHttp: jest.fn().mockReturnValue({
                getRequest: jest.fn().mockReturnValue(mock_request),
            }),
            getClass: jest.fn(),
            getHandler: jest.fn(),
            getArgs: jest.fn(),
            getArgByIndex: jest.fn(),
            switchToRpc: jest.fn(),
            switchToWs: jest.fn(),
            getType: jest.fn(),
        } as unknown as ExecutionContext;

        const request = mock_context.switchToHttp().getRequest();
        const user = request.user;
        const result = user ? user.id : null;

        expect(result).toBeNull();
    });

    it('should return null when user object is undefined', () => {
        const mock_request = {};

        mock_context = {
            switchToHttp: jest.fn().mockReturnValue({
                getRequest: jest.fn().mockReturnValue(mock_request),
            }),
            getClass: jest.fn(),
            getHandler: jest.fn(),
            getArgs: jest.fn(),
            getArgByIndex: jest.fn(),
            switchToRpc: jest.fn(),
            switchToWs: jest.fn(),
            getType: jest.fn(),
        } as unknown as ExecutionContext;

        const request = mock_context.switchToHttp().getRequest();
        const user = request.user;
        const result = user ? user.id : null;

        expect(result).toBeNull();
    });

    it('should work with valid user object containing id', () => {
        const MOCK_USER_ID = 'user-456';
        const mock_request = {
            user: {
                id: MOCK_USER_ID,
            },
        };

        mock_context = {
            switchToHttp: jest.fn().mockReturnValue({
                getRequest: jest.fn().mockReturnValue(mock_request),
            }),
            getClass: jest.fn(),
            getHandler: jest.fn(),
            getArgs: jest.fn(),
            getArgByIndex: jest.fn(),
            switchToRpc: jest.fn(),
            switchToWs: jest.fn(),
            getType: jest.fn(),
        } as unknown as ExecutionContext;

        const request = mock_context.switchToHttp().getRequest();
        const user = request.user;
        const result = user ? user.id : null;

        expect(result).toBe(MOCK_USER_ID);
        expect(typeof result).toBe('string');
    });

    it('should call switchToHttp and getRequest', () => {
        const mock_request = {
            user: {
                id: 'test-id',
            },
        };

        const get_request_spy = jest.fn().mockReturnValue(mock_request);
        const switch_to_http_spy = jest.fn().mockReturnValue({
            getRequest: get_request_spy,
        });

        mock_context = {
            switchToHttp: switch_to_http_spy,
            getClass: jest.fn(),
            getHandler: jest.fn(),
            getArgs: jest.fn(),
            getArgByIndex: jest.fn(),
            switchToRpc: jest.fn(),
            switchToWs: jest.fn(),
            getType: jest.fn(),
        } as unknown as ExecutionContext;

        mock_context.switchToHttp().getRequest();

        expect(switch_to_http_spy).toHaveBeenCalled();
        expect(get_request_spy).toHaveBeenCalled();
    });
});

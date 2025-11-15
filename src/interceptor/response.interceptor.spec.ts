import { ResponseInterceptor } from './response.interceptor';
import { Reflector } from '@nestjs/core';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';

describe('ResponseInterceptor', () => {
    let interceptor: ResponseInterceptor<any>;
    let reflector: Reflector;
    let mock_execution_context: ExecutionContext;
    let mock_call_handler: CallHandler;

    beforeEach(() => {
        reflector = new Reflector();
        interceptor = new ResponseInterceptor(reflector);

        mock_execution_context = {
            getHandler: jest.fn(),
            getClass: jest.fn(),
            switchToHttp: jest.fn(),
            switchToRpc: jest.fn(),
            switchToWs: jest.fn(),
            getType: jest.fn(),
            getArgs: jest.fn(),
            getArgByIndex: jest.fn(),
        } as any;

        mock_call_handler = {
            handle: jest.fn(),
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(interceptor).toBeDefined();
    });

    describe('intercept', () => {
        it('should wrap response with default message when no custom message', (done) => {
            const test_data = { id: 1, name: 'Test' };
            const reflector_spy = jest.spyOn(reflector, 'get').mockReturnValue(undefined);
            mock_call_handler.handle = jest.fn().mockReturnValue(of(test_data));

            interceptor.intercept(mock_execution_context, mock_call_handler).subscribe({
                next: (result) => {
                    expect(result).toEqual({
                        data: test_data,
                        count: 1,
                        message: 'Success',
                    });
                    expect(reflector_spy).toHaveBeenCalledWith(
                        RESPONSE_MESSAGE_KEY,
                        mock_execution_context.getHandler()
                    );
                    done();
                },
            });
        });

        it('should wrap response with custom message when provided', (done) => {
            const test_data = { id: 1, name: 'Test' };
            const custom_message = 'Custom success message';
            jest.spyOn(reflector, 'get').mockReturnValue(custom_message);
            mock_call_handler.handle = jest.fn().mockReturnValue(of(test_data));

            interceptor.intercept(mock_execution_context, mock_call_handler).subscribe({
                next: (result) => {
                    expect(result).toEqual({
                        data: test_data,
                        count: 1,
                        message: custom_message,
                    });
                    done();
                },
            });
        });

        it('should set count to array length when data is array', (done) => {
            const test_data = [{ id: 1 }, { id: 2 }, { id: 3 }];
            jest.spyOn(reflector, 'get').mockReturnValue(undefined);
            mock_call_handler.handle = jest.fn().mockReturnValue(of(test_data));

            interceptor.intercept(mock_execution_context, mock_call_handler).subscribe({
                next: (result) => {
                    expect(result.count).toBe(3);
                    expect(result.data).toEqual(test_data);
                    expect(result.message).toBe('Success');
                    done();
                },
            });
        });

        it('should set count to 0 when data is null', (done) => {
            jest.spyOn(reflector, 'get').mockReturnValue(undefined);
            mock_call_handler.handle = jest.fn().mockReturnValue(of(null));

            interceptor.intercept(mock_execution_context, mock_call_handler).subscribe({
                next: (result) => {
                    expect(result.count).toBe(0);
                    expect(result.data).toBeNull();
                    done();
                },
            });
        });

        it('should set count to 0 when data is undefined', (done) => {
            jest.spyOn(reflector, 'get').mockReturnValue(undefined);
            mock_call_handler.handle = jest.fn().mockReturnValue(of(undefined));

            interceptor.intercept(mock_execution_context, mock_call_handler).subscribe({
                next: (result) => {
                    expect(result.count).toBe(0);
                    expect(result.data).toBeUndefined();
                    done();
                },
            });
        });

        it('should set count to 0 when data is empty array', (done) => {
            jest.spyOn(reflector, 'get').mockReturnValue(undefined);
            mock_call_handler.handle = jest.fn().mockReturnValue(of([]));

            interceptor.intercept(mock_execution_context, mock_call_handler).subscribe({
                next: (result) => {
                    expect(result.count).toBe(0);
                    expect(result.data).toEqual([]);
                    done();
                },
            });
        });

        it('should set count to 1 for non-array object', (done) => {
            const test_data = { status: 'ok' };
            jest.spyOn(reflector, 'get').mockReturnValue(undefined);
            mock_call_handler.handle = jest.fn().mockReturnValue(of(test_data));

            interceptor.intercept(mock_execution_context, mock_call_handler).subscribe({
                next: (result) => {
                    expect(result.count).toBe(1);
                    expect(result.data).toEqual(test_data);
                    done();
                },
            });
        });

        it('should handle string data correctly', (done) => {
            const test_data = 'simple string';
            jest.spyOn(reflector, 'get').mockReturnValue(undefined);
            mock_call_handler.handle = jest.fn().mockReturnValue(of(test_data));

            interceptor.intercept(mock_execution_context, mock_call_handler).subscribe({
                next: (result) => {
                    expect(result.count).toBe(1);
                    expect(result.data).toBe(test_data);
                    done();
                },
            });
        });

        it('should handle number data correctly', (done) => {
            const test_data = 42;
            jest.spyOn(reflector, 'get').mockReturnValue(undefined);
            mock_call_handler.handle = jest.fn().mockReturnValue(of(test_data));

            interceptor.intercept(mock_execution_context, mock_call_handler).subscribe({
                next: (result) => {
                    expect(result.count).toBe(1);
                    expect(result.data).toBe(test_data);
                    done();
                },
            });
        });

        it('should handle boolean false correctly', (done) => {
            jest.spyOn(reflector, 'get').mockReturnValue(undefined);
            mock_call_handler.handle = jest.fn().mockReturnValue(of(false));

            interceptor.intercept(mock_execution_context, mock_call_handler).subscribe({
                next: (result) => {
                    expect(result.count).toBe(0);
                    expect(result.data).toBe(false);
                    done();
                },
            });
        });

        it('should handle boolean true correctly', (done) => {
            jest.spyOn(reflector, 'get').mockReturnValue(undefined);
            mock_call_handler.handle = jest.fn().mockReturnValue(of(true));

            interceptor.intercept(mock_execution_context, mock_call_handler).subscribe({
                next: (result) => {
                    expect(result.count).toBe(1);
                    expect(result.data).toBe(true);
                    done();
                },
            });
        });
    });
});

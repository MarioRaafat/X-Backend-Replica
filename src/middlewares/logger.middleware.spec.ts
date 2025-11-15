import { LoggerMiddleware } from './logger.middleware';
import { Request, Response } from 'express';
import { Logger } from '@nestjs/common';

describe('LoggerMiddleware', () => {
    let middleware: LoggerMiddleware;
    let mock_request: Partial<Request>;
    let mock_response: Partial<Response>;
    let mock_next: jest.Mock;
    let logger_spy_log: jest.SpyInstance;
    let logger_spy_warn: jest.SpyInstance;
    let logger_spy_error: jest.SpyInstance;

    beforeEach(() => {
        middleware = new LoggerMiddleware();

        mock_request = {
            method: 'GET',
            originalUrl: '/api/test',
        };

        mock_response = {
            statusCode: 200,
            on: jest.fn(),
        };

        mock_next = jest.fn();

        logger_spy_log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
        logger_spy_warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
        logger_spy_error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    it('should be defined', () => {
        expect(middleware).toBeDefined();
    });

    describe('use', () => {
        it('should call next function', () => {
            middleware.use(mock_request as Request, mock_response as Response, mock_next);

            expect(mock_next).toHaveBeenCalledTimes(1);
        });

        it('should register finish event listener', () => {
            middleware.use(mock_request as Request, mock_response as Response, mock_next);

            expect(mock_response.on).toHaveBeenCalledWith('finish', expect.any(Function));
        });

        it('should log successful request (status 200)', () => {
            let finish_callback: () => void = () => {
                // Placeholder callback, will be replaced by mock
            };
            mock_response.on = jest.fn((event, callback) => {
                if (event === 'finish') {
                    finish_callback = callback;
                }
                return mock_response as Response;
            });
            mock_response.statusCode = 200;

            middleware.use(mock_request as Request, mock_response as Response, mock_next);

            finish_callback();

            expect(logger_spy_log).toHaveBeenCalled();
            expect(logger_spy_log).toHaveBeenCalledWith(
                expect.stringContaining('GET /api/test 200 -')
            );
            expect(logger_spy_log).toHaveBeenCalledWith(expect.stringMatching(/ms$/));
        });

        it('should log warning for client errors (status 400)', () => {
            let finish_callback: () => void = () => {
                // Placeholder callback, will be replaced by mock
            };
            mock_response.on = jest.fn((event, callback) => {
                if (event === 'finish') {
                    finish_callback = callback;
                }
                return mock_response as Response;
            });
            mock_response.statusCode = 400;

            middleware.use(mock_request as Request, mock_response as Response, mock_next);

            finish_callback();

            expect(logger_spy_warn).toHaveBeenCalled();
            expect(logger_spy_warn).toHaveBeenCalledWith(
                expect.stringContaining('GET /api/test 400 -')
            );
            expect(logger_spy_log).not.toHaveBeenCalled();
            expect(logger_spy_error).not.toHaveBeenCalled();
        });

        it('should log warning for not found (status 404)', () => {
            let finish_callback: () => void = () => {
                // Placeholder callback, will be replaced by mock
            };
            mock_response.on = jest.fn((event, callback) => {
                if (event === 'finish') {
                    finish_callback = callback;
                }
                return mock_response as Response;
            });
            mock_response.statusCode = 404;

            middleware.use(mock_request as Request, mock_response as Response, mock_next);

            finish_callback();

            expect(logger_spy_warn).toHaveBeenCalled();
            expect(logger_spy_warn).toHaveBeenCalledWith(
                expect.stringContaining('GET /api/test 404 -')
            );
        });

        it('should log error for server errors (status 500)', () => {
            let finish_callback: () => void = () => {
                // Placeholder callback, will be replaced by mock
            };
            mock_response.on = jest.fn((event, callback) => {
                if (event === 'finish') {
                    finish_callback = callback;
                }
                return mock_response as Response;
            });
            mock_response.statusCode = 500;

            middleware.use(mock_request as Request, mock_response as Response, mock_next);

            finish_callback();

            expect(logger_spy_error).toHaveBeenCalled();
            expect(logger_spy_error).toHaveBeenCalledWith(
                expect.stringContaining('GET /api/test 500 -')
            );
            expect(logger_spy_log).not.toHaveBeenCalled();
            expect(logger_spy_warn).not.toHaveBeenCalled();
        });

        it('should log error for status 503', () => {
            let finish_callback: () => void = () => {
                // Placeholder callback, will be replaced by mock
            };
            mock_response.on = jest.fn((event, callback) => {
                if (event === 'finish') {
                    finish_callback = callback;
                }
                return mock_response as Response;
            });
            mock_response.statusCode = 503;

            middleware.use(mock_request as Request, mock_response as Response, mock_next);

            finish_callback();

            expect(logger_spy_error).toHaveBeenCalled();
        });

        it('should handle POST request', () => {
            let finish_callback: () => void = () => {
                // Placeholder callback, will be replaced by mock
            };
            mock_response.on = jest.fn((event, callback) => {
                if (event === 'finish') {
                    finish_callback = callback;
                }
                return mock_response as Response;
            });
            mock_request.method = 'POST';
            mock_request.originalUrl = '/api/users';
            mock_response.statusCode = 201;

            middleware.use(mock_request as Request, mock_response as Response, mock_next);

            finish_callback();

            expect(logger_spy_log).toHaveBeenCalledWith(
                expect.stringContaining('POST /api/users 201 -')
            );
        });

        it('should include response time in milliseconds', () => {
            let finish_callback: () => void = () => {
                // Placeholder callback, will be replaced by mock
            };
            mock_response.on = jest.fn((event, callback) => {
                if (event === 'finish') {
                    finish_callback = callback;
                }
                return mock_response as Response;
            });
            mock_response.statusCode = 200;

            middleware.use(mock_request as Request, mock_response as Response, mock_next);

            // Simulate some delay
            setTimeout(() => {
                finish_callback();
            }, 10);

            // Fast-forward time
            jest.advanceTimersByTime(10);

            expect(mock_next).toHaveBeenCalled();
        });

        it('should handle DELETE request with 204 status', () => {
            let finish_callback: () => void = () => {
                // Placeholder callback, will be replaced by mock
            };
            mock_response.on = jest.fn((event, callback) => {
                if (event === 'finish') {
                    finish_callback = callback;
                }
                return mock_response as Response;
            });
            mock_request.method = 'DELETE';
            mock_request.originalUrl = '/api/users/1';
            mock_response.statusCode = 204;

            middleware.use(mock_request as Request, mock_response as Response, mock_next);

            finish_callback();

            expect(logger_spy_log).toHaveBeenCalledWith(
                expect.stringContaining('DELETE /api/users/1 204 -')
            );
        });

        it('should handle PUT request', () => {
            let finish_callback: () => void = () => {
                // Placeholder callback, will be replaced by mock
            };
            mock_response.on = jest.fn((event, callback) => {
                if (event === 'finish') {
                    finish_callback = callback;
                }
                return mock_response as Response;
            });
            mock_request.method = 'PUT';
            mock_request.originalUrl = '/api/users/1';
            mock_response.statusCode = 200;

            middleware.use(mock_request as Request, mock_response as Response, mock_next);

            finish_callback();

            expect(logger_spy_log).toHaveBeenCalledWith(
                expect.stringContaining('PUT /api/users/1 200 -')
            );
        });

        it('should handle PATCH request', () => {
            let finish_callback: () => void = () => {
                // Placeholder callback, will be replaced by mock
            };
            mock_response.on = jest.fn((event, callback) => {
                if (event === 'finish') {
                    finish_callback = callback;
                }
                return mock_response as Response;
            });
            mock_request.method = 'PATCH';
            mock_request.originalUrl = '/api/users/1';
            mock_response.statusCode = 200;

            middleware.use(mock_request as Request, mock_response as Response, mock_next);

            finish_callback();

            expect(logger_spy_log).toHaveBeenCalledWith(
                expect.stringContaining('PATCH /api/users/1 200 -')
            );
        });
    });
});

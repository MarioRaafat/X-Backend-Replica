import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';
import { WsAuthMiddleware } from './ws.middleware';
import { WsJwtGuard } from 'src/auth/guards/ws-jwt.guard';

describe('WsAuthMiddleware', () => {
    let jwt_service: JwtService;
    let config_service: ConfigService;
    let mock_client: Socket;
    let mock_next: jest.Mock;

    beforeEach(() => {
        jwt_service = {
            verify: jest.fn(),
        } as any;

        config_service = {
            get: jest.fn().mockReturnValue('test-secret'),
        } as any;

        mock_client = {
            handshake: {
                headers: {},
            },
            data: {},
        } as any;

        mock_next = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    it('should create a middleware function', () => {
        const middleware = WsAuthMiddleware(jwt_service, config_service);

        expect(middleware).toBeDefined();
        expect(typeof middleware).toBe('function');
    });

    it('should validate token and attach user to client.data on success', () => {
        const mock_user = { id: '123', email: 'test@example.com' };
        mock_client = {
            handshake: {
                headers: {
                    authorization: 'Bearer valid-token',
                },
            },
            data: {},
        } as any;

        (jwt_service.verify as jest.Mock).mockReturnValue(mock_user);

        const middleware = WsAuthMiddleware(jwt_service, config_service);
        middleware(mock_client, mock_next);

        expect(mock_client.data.user).toEqual(mock_user);
        expect(mock_next).toHaveBeenCalledWith();
        expect(mock_next).toHaveBeenCalledTimes(1);
    });

    it('should call next with error when authorization header is missing', () => {
        mock_client = {
            handshake: {
                headers: {},
            },
            data: {},
        } as any;

        const middleware = WsAuthMiddleware(jwt_service, config_service);
        middleware(mock_client, mock_next);

        expect(mock_next).toHaveBeenCalledWith(expect.any(UnauthorizedException));
        expect(mock_next).toHaveBeenCalledTimes(1);
        expect(mock_client.data.user).toBeUndefined();
    });

    it('should call next with error when authorization header is undefined', () => {
        mock_client = {
            handshake: {
                headers: {
                    authorization: undefined,
                },
            },
            data: {},
        } as any;

        const middleware = WsAuthMiddleware(jwt_service, config_service);
        middleware(mock_client, mock_next);

        expect(mock_next).toHaveBeenCalledWith(expect.any(UnauthorizedException));
        expect(mock_next).toHaveBeenCalledTimes(1);
    });

    it('should call next with error when token format is invalid', () => {
        mock_client = {
            handshake: {
                headers: {
                    authorization: 'InvalidFormat',
                },
            },
            data: {},
        } as any;

        const middleware = WsAuthMiddleware(jwt_service, config_service);
        middleware(mock_client, mock_next);

        expect(mock_next).toHaveBeenCalledWith(expect.any(UnauthorizedException));
        expect(mock_next).toHaveBeenCalledTimes(1);
    });

    it('should call next with error when token is missing after Bearer', () => {
        mock_client = {
            handshake: {
                headers: {
                    authorization: 'Bearer',
                },
            },
            data: {},
        } as any;

        const middleware = WsAuthMiddleware(jwt_service, config_service);
        middleware(mock_client, mock_next);

        expect(mock_next).toHaveBeenCalledWith(expect.any(UnauthorizedException));
        expect(mock_next).toHaveBeenCalledTimes(1);
    });

    it('should call next with error when token is empty after Bearer', () => {
        mock_client = {
            handshake: {
                headers: {
                    authorization: 'Bearer ',
                },
            },
            data: {},
        } as any;

        const middleware = WsAuthMiddleware(jwt_service, config_service);
        middleware(mock_client, mock_next);

        expect(mock_next).toHaveBeenCalledWith(expect.any(UnauthorizedException));
        expect(mock_next).toHaveBeenCalledTimes(1);
    });

    it('should call next with error when JWT verification fails', () => {
        mock_client = {
            handshake: {
                headers: {
                    authorization: 'Bearer invalid-token',
                },
            },
            data: {},
        } as any;

        (jwt_service.verify as jest.Mock).mockImplementation(() => {
            throw new Error('Invalid token');
        });

        const middleware = WsAuthMiddleware(jwt_service, config_service);
        middleware(mock_client, mock_next);

        expect(mock_next).toHaveBeenCalledWith(expect.any(UnauthorizedException));
        expect(mock_next).toHaveBeenCalledTimes(1);
        expect(mock_client.data.user).toBeUndefined();
    });

    it('should call next with error when JWT is expired', () => {
        mock_client = {
            handshake: {
                headers: {
                    authorization: 'Bearer expired-token',
                },
            },
            data: {},
        } as any;

        (jwt_service.verify as jest.Mock).mockImplementation(() => {
            throw new Error('jwt expired');
        });

        const middleware = WsAuthMiddleware(jwt_service, config_service);
        middleware(mock_client, mock_next);

        expect(mock_next).toHaveBeenCalledWith(expect.any(UnauthorizedException));
        expect(mock_next).toHaveBeenCalledTimes(1);
    });

    it('should call next with error when JWT is malformed', () => {
        mock_client = {
            handshake: {
                headers: {
                    authorization: 'Bearer malformed.token',
                },
            },
            data: {},
        } as any;

        (jwt_service.verify as jest.Mock).mockImplementation(() => {
            throw new Error('jwt malformed');
        });

        const middleware = WsAuthMiddleware(jwt_service, config_service);
        middleware(mock_client, mock_next);

        expect(mock_next).toHaveBeenCalledWith(expect.any(UnauthorizedException));
        expect(mock_next).toHaveBeenCalledTimes(1);
    });

    it('should use WsJwtGuard.validateToken for token validation', () => {
        const mock_user = { id: '456', username: 'testuser' };
        mock_client = {
            handshake: {
                headers: {
                    authorization: 'Bearer valid-token',
                },
            },
            data: {},
        } as any;

        const validate_token_spy = jest
            .spyOn(WsJwtGuard, 'validateToken')
            .mockReturnValue(mock_user);

        const middleware = WsAuthMiddleware(jwt_service, config_service);
        middleware(mock_client, mock_next);

        expect(validate_token_spy).toHaveBeenCalledWith(mock_client, jwt_service, config_service);
        expect(mock_client.data.user).toEqual(mock_user);
        expect(mock_next).toHaveBeenCalledWith();
    });

    it('should pass JWT secret from ConfigService to validator', () => {
        const mock_user = { id: '789', email: 'user@test.com' };
        mock_client = {
            handshake: {
                headers: {
                    authorization: 'Bearer valid-token',
                },
            },
            data: {},
        } as any;

        (jwt_service.verify as jest.Mock).mockReturnValue(mock_user);
        (config_service.get as jest.Mock).mockReturnValue('custom-secret');

        const middleware = WsAuthMiddleware(jwt_service, config_service);
        middleware(mock_client, mock_next);

        expect(jwt_service.verify).toHaveBeenCalledWith('valid-token', {
            secret: 'custom-secret',
        });
        expect(config_service.get).toHaveBeenCalledWith('JWT_TOKEN_SECRET');
    });

    it('should handle errors from validateToken gracefully', () => {
        mock_client = {
            handshake: {
                headers: {
                    authorization: 'Bearer error-token',
                },
            },
            data: {},
        } as any;

        const custom_error = new UnauthorizedException('Custom error message');
        jest.spyOn(WsJwtGuard, 'validateToken').mockImplementation(() => {
            throw custom_error;
        });

        const middleware = WsAuthMiddleware(jwt_service, config_service);
        middleware(mock_client, mock_next);

        expect(mock_next).toHaveBeenCalledWith(custom_error);
        expect(mock_next).toHaveBeenCalledTimes(1);
        expect(mock_client.data.user).toBeUndefined();
    });

    it('should not modify client.data if validation fails', () => {
        mock_client = {
            handshake: {
                headers: {
                    authorization: 'Bearer invalid',
                },
            },
            data: { existingData: 'should remain' },
        } as any;

        jest.spyOn(WsJwtGuard, 'validateToken').mockImplementation(() => {
            throw new UnauthorizedException('Invalid');
        });

        const middleware = WsAuthMiddleware(jwt_service, config_service);
        middleware(mock_client, mock_next);

        expect(mock_client.data).toEqual({ existingData: 'should remain' });
        expect(mock_client.data.user).toBeUndefined();
    });

    it('should attach user to client.data.user property specifically', () => {
        const mock_user = { id: '999', role: 'admin' };
        mock_client = {
            handshake: {
                headers: {
                    authorization: 'Bearer valid-token',
                },
            },
            data: { otherData: 'preserved' },
        } as any;

        (jwt_service.verify as jest.Mock).mockReturnValue(mock_user);

        const middleware = WsAuthMiddleware(jwt_service, config_service);
        middleware(mock_client, mock_next);

        expect(mock_client.data).toEqual({
            otherData: 'preserved',
            user: mock_user,
        });
    });
});

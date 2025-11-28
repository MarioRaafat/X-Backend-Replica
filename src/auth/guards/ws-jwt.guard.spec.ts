import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsException } from '@nestjs/websockets';
import { WsJwtGuard } from './ws-jwt.guard';
import { Socket } from 'socket.io';

describe('WsJwtGuard', () => {
    let guard: WsJwtGuard;
    let jwt_service: JwtService;
    let config_service: ConfigService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WsJwtGuard,
                {
                    provide: JwtService,
                    useValue: {
                        verify: jest.fn(),
                        verifyAsync: jest.fn(),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockReturnValue('test-secret'),
                    },
                },
            ],
        }).compile();

        guard = module.get<WsJwtGuard>(WsJwtGuard);
        jwt_service = module.get<JwtService>(JwtService);
        config_service = module.get<ConfigService>(ConfigService);
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    describe('canActivate (async)', () => {
        it('should be defined', () => {
            expect(guard).toBeDefined();
        });

        it('should activate with valid token from auth', async () => {
            const mock_user = { id: 'user-123', username: 'testuser' };
            const mock_client = {
                handshake: {
                    auth: {
                        token: 'valid-token',
                    },
                    headers: {},
                },
                user: undefined,
            } as any;

            const context = {
                getType: jest.fn().mockReturnValue('ws'),
                switchToWs: jest.fn().mockReturnValue({
                    getClient: jest.fn().mockReturnValue(mock_client),
                }),
            } as any as ExecutionContext;

            jest.spyOn(jwt_service, 'verifyAsync').mockResolvedValue(mock_user);

            const result = await guard.canActivate(context);

            expect(result).toBe(true);
            expect(mock_client.user).toEqual({
                user_id: 'user-123',
                username: 'testuser',
            });
        });

        it('should throw WsException when no token is provided', async () => {
            const mock_client = {
                handshake: {
                    headers: {},
                },
            } as any;

            const context = {
                getType: jest.fn().mockReturnValue('ws'),
                switchToWs: jest.fn().mockReturnValue({
                    getClient: jest.fn().mockReturnValue(mock_client),
                }),
            } as any as ExecutionContext;

            await expect(guard.canActivate(context)).rejects.toThrow(WsException);
        });

        it('should throw WsException when token verification fails', async () => {
            const mock_client = {
                handshake: {
                    auth: {
                        token: 'invalid-token',
                    },
                    headers: {},
                },
            } as any;

            const context = {
                getType: jest.fn().mockReturnValue('ws'),
                switchToWs: jest.fn().mockReturnValue({
                    getClient: jest.fn().mockReturnValue(mock_client),
                }),
            } as any as ExecutionContext;

            jest.spyOn(jwt_service, 'verifyAsync').mockRejectedValue(new Error('Invalid token'));

            await expect(guard.canActivate(context)).rejects.toThrow(WsException);
        });

        it('should extract token from query params', async () => {
            const mock_user = { id: 'user-456', username: 'testuser2' };
            const mock_client = {
                handshake: {
                    query: {
                        token: 'query-token',
                    },
                    headers: {},
                },
                user: undefined,
            } as any;

            const context = {
                getType: jest.fn().mockReturnValue('ws'),
                switchToWs: jest.fn().mockReturnValue({
                    getClient: jest.fn().mockReturnValue(mock_client),
                }),
            } as any as ExecutionContext;

            jest.spyOn(jwt_service, 'verifyAsync').mockResolvedValue(mock_user);

            const result = await guard.canActivate(context);

            expect(result).toBe(true);
            expect(mock_client.user).toEqual({
                user_id: 'user-456',
                username: 'testuser2',
            });
        });

        it('should extract token from Authorization header', async () => {
            const mock_user = { id: 'user-789', username: 'testuser3' };
            const mock_client = {
                handshake: {
                    headers: {
                        authorization: 'Bearer header-token',
                    },
                },
                user: undefined,
            } as any;

            const context = {
                getType: jest.fn().mockReturnValue('ws'),
                switchToWs: jest.fn().mockReturnValue({
                    getClient: jest.fn().mockReturnValue(mock_client),
                }),
            } as any as ExecutionContext;

            jest.spyOn(jwt_service, 'verifyAsync').mockResolvedValue(mock_user);

            const result = await guard.canActivate(context);

            expect(result).toBe(true);
            expect(mock_client.user).toEqual({
                user_id: 'user-789',
                username: 'testuser3',
            });
        });
    });

    describe('validateToken (static)', () => {
        it('should validate and return user payload for valid token', () => {
            const mock_user = { id: '123', email: 'test@example.com' };
            const mock_client = {
                handshake: {
                    headers: {
                        authorization: 'Bearer valid-token',
                    },
                },
            } as any as Socket;

            (jwt_service.verify as jest.Mock).mockReturnValue(mock_user);

            const result = WsJwtGuard.validateToken(mock_client, jwt_service, config_service);

            expect(result).toEqual({ user_id: '123' });
            expect(jwt_service.verify).toHaveBeenCalledWith('valid-token', {
                secret: 'test-secret',
            });
            expect(config_service.get).toHaveBeenCalledWith('JWT_TOKEN_SECRET');
        });

        it('should throw WsException when authorization header is missing', () => {
            const mock_client = {
                handshake: {
                    headers: {},
                },
            } as any as Socket;

            expect(() => {
                WsJwtGuard.validateToken(mock_client, jwt_service, config_service);
            }).toThrow(WsException);
        });

        it('should throw WsException when JWT verification fails', () => {
            const mock_client = {
                handshake: {
                    headers: {
                        authorization: 'Bearer invalid-token',
                    },
                },
            } as any as Socket;

            (jwt_service.verify as jest.Mock).mockImplementation(() => {
                throw new Error('Invalid token');
            });

            expect(() => {
                WsJwtGuard.validateToken(mock_client, jwt_service, config_service);
            }).toThrow(WsException);
        });

        it('should extract token from handshake auth', () => {
            const mock_user = { id: '123' };
            const mock_client = {
                handshake: {
                    auth: {
                        token: 'auth-token',
                    },
                    headers: {},
                },
            } as any as Socket;

            (jwt_service.verify as jest.Mock).mockReturnValue(mock_user);

            const result = WsJwtGuard.validateToken(mock_client, jwt_service, config_service);

            expect(result).toEqual({ user_id: '123' });
            expect(jwt_service.verify).toHaveBeenCalledWith('auth-token', {
                secret: 'test-secret',
            });
        });

        it('should extract token from query params', () => {
            const mock_user = { id: '456' };
            const mock_client = {
                handshake: {
                    query: {
                        token: 'query-token',
                    },
                    headers: {},
                },
            } as any as Socket;

            (jwt_service.verify as jest.Mock).mockReturnValue(mock_user);

            const result = WsJwtGuard.validateToken(mock_client, jwt_service, config_service);

            expect(result).toEqual({ user_id: '456' });
        });
    });
});

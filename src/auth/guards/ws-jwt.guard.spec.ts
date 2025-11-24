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

    describe('canActivate', () => {
        it('should be defined', () => {
            expect(guard).toBeDefined();
        });

        it('should return true for non-WebSocket contexts', () => {
            const context = {
                getType: jest.fn().mockReturnValue('http'),
            } as any as ExecutionContext;

            const result = guard.canActivate(context);

            expect(result).toBe(true);
        });

        it('should validate token and attach user to client for WebSocket context', () => {
            const mock_user = { id: '123', email: 'test@example.com' };
            const mock_client = {
                handshake: {
                    headers: {
                        authorization: 'Bearer valid-token',
                    },
                },
                data: {},
            } as any as Socket;

            const context = {
                getType: jest.fn().mockReturnValue('ws'),
                switchToWs: jest.fn().mockReturnValue({
                    getClient: jest.fn().mockReturnValue(mock_client),
                }),
            } as any as ExecutionContext;

            jest.spyOn(jwt_service, 'verify').mockReturnValue(mock_user);

            const result = guard.canActivate(context);

            expect(result).toBe(true);
            expect(mock_client.data.user).toEqual(mock_user);
            expect(jwt_service.verify).toHaveBeenCalledWith('valid-token', {
                secret: 'test-secret',
            });
        });

        it('should return false when validateToken returns null', () => {
            const mock_client = {
                handshake: {
                    headers: {
                        authorization: 'Bearer invalid-token',
                    },
                },
                data: {},
            } as any as Socket;

            const context = {
                getType: jest.fn().mockReturnValue('ws'),
                switchToWs: jest.fn().mockReturnValue({
                    getClient: jest.fn().mockReturnValue(mock_client),
                }),
            } as any as ExecutionContext;

            jest.spyOn(WsJwtGuard, 'validateToken').mockReturnValue({ user_id: null });

            const result = guard.canActivate(context);

            expect(result).toBe(false);
        });
    });

    describe('validateToken', () => {
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

            expect(result).toEqual(mock_user);
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

            expect(() => {
                WsJwtGuard.validateToken(mock_client, jwt_service, config_service);
            }).toThrow('No authorization header');
        });

        it('should throw WsException when authorization header is undefined', () => {
            const mock_client = {
                handshake: {
                    headers: {
                        authorization: undefined,
                    },
                },
            } as any as Socket;

            expect(() => {
                WsJwtGuard.validateToken(mock_client, jwt_service, config_service);
            }).toThrow(WsException);

            expect(() => {
                WsJwtGuard.validateToken(mock_client, jwt_service, config_service);
            }).toThrow('No authorization header');
        });

        it('should throw WsException when token is missing', () => {
            const mock_client = {
                handshake: {
                    headers: {
                        authorization: 'Bearer',
                    },
                },
            } as any as Socket;

            expect(() => {
                WsJwtGuard.validateToken(mock_client, jwt_service, config_service);
            }).toThrow(WsException);

            expect(() => {
                WsJwtGuard.validateToken(mock_client, jwt_service, config_service);
            }).toThrow('Invalid authorization format');
        });

        it('should throw WsException when token after Bearer is empty', () => {
            const mock_client = {
                handshake: {
                    headers: {
                        authorization: 'Bearer ',
                    },
                },
            } as any as Socket;

            expect(() => {
                WsJwtGuard.validateToken(mock_client, jwt_service, config_service);
            }).toThrow(WsException);

            expect(() => {
                WsJwtGuard.validateToken(mock_client, jwt_service, config_service);
            }).toThrow('Invalid authorization format');
        });

        it('should throw WsException when authorization format is invalid', () => {
            const mock_client = {
                handshake: {
                    headers: {
                        authorization: 'InvalidFormat',
                    },
                },
            } as any as Socket;

            expect(() => {
                WsJwtGuard.validateToken(mock_client, jwt_service, config_service);
            }).toThrow(WsException);

            expect(() => {
                WsJwtGuard.validateToken(mock_client, jwt_service, config_service);
            }).toThrow('Invalid authorization format');
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

            expect(() => {
                WsJwtGuard.validateToken(mock_client, jwt_service, config_service);
            }).toThrow('Invalid token');
        });

        it('should throw WsException when JWT is expired', () => {
            const mock_client = {
                handshake: {
                    headers: {
                        authorization: 'Bearer expired-token',
                    },
                },
            } as any as Socket;

            (jwt_service.verify as jest.Mock).mockImplementation(() => {
                throw new Error('jwt expired');
            });

            expect(() => {
                WsJwtGuard.validateToken(mock_client, jwt_service, config_service);
            }).toThrow(WsException);
        });

        it('should handle malformed JWT tokens', () => {
            const mock_client = {
                handshake: {
                    headers: {
                        authorization: 'Bearer malformed.token',
                    },
                },
            } as any as Socket;

            (jwt_service.verify as jest.Mock).mockImplementation(() => {
                throw new Error('jwt malformed');
            });

            expect(() => {
                WsJwtGuard.validateToken(mock_client, jwt_service, config_service);
            }).toThrow(WsException);
        });
    });
});

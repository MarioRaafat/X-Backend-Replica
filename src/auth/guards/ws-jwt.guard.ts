import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

interface IAuthenticatedSocket extends Socket {
    user?: {
        user_id: string;
        username: string;
    };
}

@Injectable()
export class WsJwtGuard implements CanActivate {
    constructor(private jwt_service: JwtService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        try {
            const client: IAuthenticatedSocket = context.switchToWs().getClient();
            const token = this.extractTokenFromHandshake(client);

            if (!token) {
                throw new WsException('Unauthorized - No token provided');
            }

            const payload = await this.jwt_service.verifyAsync(token, {
                secret: process.env.JWT_TOKEN_SECRET,
            });

            client.user = {
                user_id: payload.id,
                username: payload.username,
            };

            return true;
        } catch (error) {
            throw new WsException('Unauthorized - Invalid token');
        }
    }

    static validateToken(client: Socket, jwt_service: JwtService, config_service: ConfigService) {
        try {
            const token = WsJwtGuard.extractTokenFromHandshake(client);

            if (!token) {
                throw new WsException('Unauthorized - No token provided');
            }

            const payload = jwt_service.verify(token, {
                secret:
                    config_service.get<string>('JWT_TOKEN_SECRET') || process.env.JWT_TOKEN_SECRET,
            });

            return {
                user_id: payload.id,
                // username: payload.username,
            };
        } catch (error) {
            throw new WsException('Unauthorized - Invalid token');
        }
    }

    private extractTokenFromHandshake(client: Socket): string | undefined {
        return WsJwtGuard.extractTokenFromHandshake(client);
    }

    private static extractTokenFromHandshake(client: Socket): string | undefined {
        // Try to get token from handshake auth
        const token = client.handshake.auth?.token;
        if (token) {
            return token;
        }

        // Try to get token from query params (fallback)
        const query_token = client.handshake.query?.token;
        if (query_token && typeof query_token === 'string') {
            return query_token;
        }

        // Try to get token from headers (Authorization: Bearer <token>)
        const auth_header = client.handshake.headers?.authorization;
        if (auth_header) {
            const [type, header_token] = auth_header.split(' ');
            if (type === 'Bearer' && header_token) {
                return header_token;
            }
        }

        return undefined;
    }
}

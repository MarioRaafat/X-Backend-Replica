import { Socket } from 'socket.io';
import { WsJwtGuard } from 'src/auth/guards/ws-jwt.guard';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export type SocketIOMiddleware = {
    (client: Socket, next: (err?: Error) => void);
};

export const WsAuthMiddleware = (
    jwt_service: JwtService,
    config_service: ConfigService
): SocketIOMiddleware => {
    return (client: Socket, next: (err?: Error) => void) => {
        try {
            const user = WsJwtGuard.validateToken(client, jwt_service, config_service);
            client.data.user = user;
            next();
        } catch (error) {
            next(error);
        }
    };
};

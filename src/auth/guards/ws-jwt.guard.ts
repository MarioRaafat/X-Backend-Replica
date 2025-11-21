import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';
import { Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WsJwtGuard implements CanActivate {
    constructor(
        private readonly jwt_service: JwtService,
        private readonly config_service: ConfigService
    ) {}

    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        if (context.getType() !== 'ws') return true;

        const client: Socket = context.switchToWs().getClient();
        const user = WsJwtGuard.validateToken(client, this.jwt_service, this.config_service);

        if (!user) return false;

        client.data.user = user;
        return true;
    }

    static validateToken(client: Socket, jwt_service: JwtService, config_service: ConfigService) {
        const { authorization } = client.handshake.headers;

        if (!authorization) throw new UnauthorizedException('No authorization header');

        const token = authorization.split(' ')[1];

        if (!token) throw new UnauthorizedException('Invalid authorization format');

        try {
            const payload = jwt_service.verify(token, {
                secret: config_service.get('JWT_TOKEN_SECRET'),
            });
            return payload;
        } catch (error) {
            throw new UnauthorizedException('Invalid token');
        }
    }
}

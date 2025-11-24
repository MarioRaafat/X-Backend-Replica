import {
    ConnectedSocket,
    MessageBody,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsAuthMiddleware } from 'src/middlewares/ws.middleware';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NotificationType } from './enums/notification-types';

@WebSocketGateway()
export class NotificationsGateway {
    @WebSocketServer()
    server: Server<any, any>; // the first is from client to server, the second is from server to client

    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService
    ) {}

    afterInit(server: Server) {
        server.use(WsAuthMiddleware(this.jwtService, this.configService));
    }

    handleConnection(client: Socket) {
        const user_id = client.data.user_id;
        if (!user_id) {
            client.disconnect();
            return;
        }
        client.join(user_id);
        console.log(`Client connected: ${client.id} for user ${user_id}`);
    }

    @SubscribeMessage('message')
    onMarkSeen(client: any, payload: any) {
        return 'Hello';
    }

    sendToUser(event: NotificationType, notified_id: string, payload: any) {
        this.server.to(notified_id).emit(event, payload);
    }
}

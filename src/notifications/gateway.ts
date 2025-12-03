import { SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsAuthMiddleware } from 'src/middlewares/ws.middleware';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NotificationType } from './enums/notification-types';

@WebSocketGateway()
export class NotificationsGateway {
    @WebSocketServer()
    server: Server<any, any>; // the first is from client to server, the second is from server to client

    private notificationsService: any;

    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService
    ) {}

    setNotificationsService(service: any) {
        this.notificationsService = service;
    }

    afterInit(server: Server) {
        server.use(WsAuthMiddleware(this.jwtService, this.configService));
    }

    async handleConnection(client: Socket) {
        const user_id = client.data.user.id;
        if (!user_id) {
            client.disconnect();
            return;
        }
        client.join(user_id);
        console.log(`Client connected: ${client.id} for user ${user_id}`);

        // Send newest_count on connection
        if (this.notificationsService) {
            try {
                const newest_count = await this.notificationsService.getNewestCount(user_id);
                console.log(
                    `Sending newest_count ${newest_count} to user ${user_id} on connection`
                );
                this.sendToUser(NotificationType.NEWEST_COUNT, user_id, { newest_count });
            } catch (error) {
                console.error('Error fetching newest_count on connection:', error);
            }
        }
    }

    @SubscribeMessage('mark_seen')
    async onMarkSeen(client: Socket, payload: any) {
        try {
            const user_id = client.data.user?.id;
            if (!user_id) {
                return { success: false, message: 'User not authenticated' };
            }

            if (this.notificationsService) {
                await this.notificationsService.clearNewestCount(user_id);
            }

            this.sendToUser(NotificationType.NEWEST_COUNT, user_id, { newest_count: 0 });
        } catch (error) {
            console.error('Error marking notifications as seen:', error);
            return { success: false, message: 'Error clearing notifications count' };
        }
    }

    sendToUser(event: NotificationType, notified_id: string, payload: any) {
        this.server.to(notified_id).emit(event, payload);
    }
}

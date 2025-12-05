import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { NotificationType } from './enums/notification-types';

@Injectable()
export class NotificationsGateway {
    server: Server<any, any>; // the first is from client to server, the second is from server to client

    private notifications_service: any;

    constructor() {}

    setNotificationsService(service: any) {
        this.notifications_service = service;
    }

    setServer(server: Server) {
        this.server = server;
    }

    async onConnection(client: Socket, user_id: string) {
        console.log('NotificationsGateway: New connection:', user_id);

        // Send newest_count on connection
        if (this.notifications_service) {
            try {
                const newest_count = await this.notifications_service.getNewestCount(user_id);
                console.log(
                    `Sending newest_count ${newest_count} to user ${user_id} on connection`
                );
                this.sendToUser(NotificationType.NEWEST_COUNT, user_id, { newest_count });
            } catch (error) {
                console.error('Error fetching newest_count on connection:', error);
            }
        }
    }

    async onMarkSeen(client: Socket, payload: any) {
        try {
            const user_id = client.data.user?.id;
            if (!user_id) {
                return { success: false, message: 'User not authenticated' };
            }

            if (this.notifications_service) {
                await this.notifications_service.clearNewestCount(user_id);
            }

            this.sendToUser(NotificationType.NEWEST_COUNT, user_id, { newest_count: 0 });
        } catch (error) {
            console.error('Error marking notifications as seen:', error);
            return { success: false, message: 'Error clearing notifications count' };
        }
    }

    sendToUser(event: NotificationType, notified_id: string, payload: any) {
        console.log(event, notified_id, payload);

        this.server.to(notified_id).emit(event, payload);
    }
}

import {
    ConnectedSocket,
    MessageBody,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
    cors: { origin: '*' },
    transports: ['websocket'],
})
export class NotificationsGateway {
    @WebSocketServer()
    server: Server;

    handleConnection(socket: Socket) {
        const user_id =
            (socket.handshake.auth as any)?.user_id ||
            (socket.handshake.query.user_id as string | undefined);

        if (!user_id) {
            socket.disconnect();
            return;
        }

        socket.data.user_id = user_id;
        socket.join(user_id);
        console.log(`User ${user_id} connected: ${socket.id}`);
    }

    handleDisconnect(socket: Socket) {
        console.log(`Socket disconnected: ${socket.id}`);
    }

    @SubscribeMessage('mark_seen')
    onMarkSeen(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
        const user_id: string | undefined = client.data.user_id;
        if (user_id) {
            this.server.to(user_id).emit('mark_seen', { ok: true, data });
        } else {
            client.emit('mark_seen', { ok: true, data });
        }
        return { ok: true };
    }

    sendToUser(user_id: string, payload: unknown) {
        this.server.to(user_id).emit('notification', payload);
    }
}

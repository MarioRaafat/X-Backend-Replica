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
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { MessagesGateway } from '../messages/messages.gateway';

@WebSocketGateway({
    path: process.env.SOCKET_IO || '/socket.io',
    cors: {
        origin: true,
        credentials: true,
    },
})
export class BaseGateway {
    @WebSocketServer()
    server: Server;

    constructor(
        private readonly jwt: JwtService,
        private readonly config: ConfigService,
        private readonly notifications: NotificationsGateway,
        private readonly messages: MessagesGateway
    ) {}

    afterInit(server: Server) {
        server.use(WsAuthMiddleware(this.jwt, this.config));

        // Set the server instance for both handlers
        this.notifications.setServer(server);
        this.messages.setServer(server);
    }

    async handleConnection(client: Socket) {
        const user_id = client.data?.user?.id;
        if (!user_id) return client.disconnect();

        client.join(user_id);

        await this.notifications.onConnection(client, user_id);
        await this.messages.onConnection(client, user_id);
    }

    handleDisconnect(client: Socket) {
        const user_id = client.data?.user?.id;

        this.messages.onDisconnect(client, user_id);
        console.log('Disconnected:', client.id);
    }

    /************************************** Notification events **************************************/
    @SubscribeMessage('mark_seen')
    async handleMarkSeen(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
        return this.notifications.onMarkSeen(client, payload);
    }

    /************************************** Messages events **************************************/
    @SubscribeMessage('join_chat')
    async handleJoinChat(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
        return this.messages.handleJoinChat(client, data);
    }

    @SubscribeMessage('leave_chat')
    async handleLeaveChat(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
        return this.messages.handleLeaveChat(client, data);
    }

    @SubscribeMessage('send_message')
    async handleSendMessage(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
        return this.messages.handleSendMessage(client, data);
    }

    @SubscribeMessage('add_reaction')
    async handleAddReaction(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
        return this.messages.handleAddReaction(client, data);
    }

    @SubscribeMessage('remove_reaction')
    async handleRemoveReaction(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
        return this.messages.handleRemoveReaction(client, data);
    }

    @SubscribeMessage('update_message')
    async handleUpdateMessage(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
        return this.messages.handleUpdateMessage(client, data);
    }

    @SubscribeMessage('delete_message')
    async handleDeleteMessage(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
        return this.messages.handleDeleteMessage(client, data);
    }

    @SubscribeMessage('typing_start')
    async handleTypingStart(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
        return this.messages.handleTypingStart(client, data);
    }

    @SubscribeMessage('typing_stop')
    async handleTypingStop(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
        return this.messages.handleTypingStop(client, data);
    }

    @SubscribeMessage('get_messages')
    async handleGetMessages(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
        return this.messages.handleGetMessages(client, data);
    }
}

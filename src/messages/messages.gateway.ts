import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MessagesService } from './messages.service';
import { GetMessagesQueryDto, SendMessageDto, UpdateMessageDto } from './dto';
import { WsJwtGuard } from 'src/auth/guards/ws-jwt.guard';

interface IAuthenticatedSocket extends Socket {
    user?: {
        user_id: string;
    };
}

@WebSocketGateway({
    namespace: '/messages',
    cors: {
        origin: true,
        credentials: true,
    },
})
@UseGuards(WsJwtGuard)
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;
    // Store active connections: user_id -> socket_id[]
    private userSockets = new Map<string, Set<string>>();
    constructor(
        private readonly messages_service: MessagesService,
        private readonly jwt_service: JwtService,
        private readonly config_service: ConfigService
    ) {}

    async handleConnection(client: IAuthenticatedSocket) {
        // try {
        //     const user = WsJwtGuard.validateToken(client, this.jwt_service, this.config_service);
        //     client.user = user;
        //     const user_id = client.user.user_id;
        //     if (!this.userSockets.has(user_id)) {
        //         this.userSockets.set(user_id, new Set());
        //     }
        //     this.userSockets.get(user_id)?.add(client.id);
        //     console.log(`Client connected: ${client.id} (User: ${user_id})`);
        // } catch (error) {
        //     console.error('Connection error:', error);
        //     client.disconnect();
        // }
    }

    handleDisconnect(client: IAuthenticatedSocket) {
        const user_id = client.user?.user_id;
        if (user_id) {
            const user_socket_set = this.userSockets.get(user_id);
            if (user_socket_set) {
                user_socket_set.delete(client.id);
                if (user_socket_set.size === 0) {
                    this.userSockets.delete(user_id);
                }
            }
        }
        console.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('join_chat')
    async handleJoinChat(
        @ConnectedSocket() client: IAuthenticatedSocket,
        @MessageBody() data: { chat_id: string }
    ) {
        try {
            const user_id = client.user!.user_id;
            const { chat_id } = data;

            await this.messages_service.validateChatParticipation(user_id, chat_id);

            await client.join(chat_id);
            return {
                event: 'joined_chat',
                data: { chat_id, message: 'Successfully joined chat' },
            };
        } catch (error) {
            return {
                event: 'error',
                data: { message: error.message || 'Failed to join chat' },
            };
        }
    }

    @SubscribeMessage('leave_chat')
    async handleLeaveChat(
        @ConnectedSocket() client: IAuthenticatedSocket,
        @MessageBody() data: { chat_id: string }
    ) {
        try {
            const { chat_id } = data;
            const user_id = client.user!.user_id;
            await this.messages_service.validateChatParticipation(user_id, chat_id);

            await client.leave(chat_id);
            return {
                event: 'left_chat',
                data: { chat_id, message: 'Successfully left chat' },
            };
        } catch (error) {
            return {
                event: 'error',
                data: { message: error.message || 'Failed to leave chat' },
            };
        }
    }

    @SubscribeMessage('send_message')
    async handleSendMessage(
        @ConnectedSocket() client: IAuthenticatedSocket,
        @MessageBody() data: { chat_id: string; message: SendMessageDto }
    ) {
        try {
            const user_id = client.user!.user_id;
            const { chat_id, message } = data;

            const result = await this.messages_service.sendMessage(user_id, chat_id, message);

            // Emit to the chat room (for users already in the room)
            this.server.to(chat_id).emit('new_message', {
                chat_id: chat_id,
                message: result,
            });

            // Also emit directly to the recipient (in case they're not in the room yet)
            const recipient_id = result.recipient_id;
            if (recipient_id) {
                this.emitToUser(recipient_id, 'new_message', {
                    chat_id,
                    message: result,
                });
            }

            return {
                event: 'message_sent',
                data: result,
            };
        } catch (error) {
            return {
                event: 'error',
                data: { message: error.message || 'Failed to send message' },
            };
        }
    }

    @SubscribeMessage('get_messages')
    async handleGetMessages(
        @ConnectedSocket() client: IAuthenticatedSocket,
        @MessageBody() data: { chat_id: string; query?: GetMessagesQueryDto }
    ) {
        try {
            const user_id = client.user!.user_id;
            const { chat_id, query } = data;

            const messages = await this.messages_service.getMessages(user_id, chat_id, query || {});

            return {
                event: 'messages_retrieved',
                data: messages,
            };
        } catch (error) {
            return {
                event: 'error',
                data: { message: error.message || 'Failed to retrieve messages' },
            };
        }
    }

    @SubscribeMessage('update_message')
    async handleUpdateMessage(
        @ConnectedSocket() client: IAuthenticatedSocket,
        @MessageBody()
        data: { chat_id: string; message_id: string; update: UpdateMessageDto }
    ) {
        try {
            const user_id = client.user!.user_id;
            const { chat_id, message_id, update } = data;

            const result = await this.messages_service.updateMessage(
                user_id,
                chat_id,
                message_id,
                update
            );
            this.server.to(chat_id).emit('message_updated', {
                chat_id,
                message_id,
                message: result,
            });

            const recipient_id = result.recipient_id;
            if (recipient_id) {
                this.emitToUser(recipient_id, 'message_updated', {
                    chat_id,
                    message_id,
                    message: result,
                });
            }

            return {
                event: 'message_updated',
                data: result,
            };
        } catch (error) {
            return {
                event: 'error',
                data: { message: error.message || 'Failed to update message' },
            };
        }
    }

    @SubscribeMessage('delete_message')
    async handleDeleteMessage(
        @ConnectedSocket() client: IAuthenticatedSocket,
        @MessageBody() data: { chat_id: string; message_id: string }
    ) {
        try {
            const user_id = client.user!.user_id;
            const { chat_id, message_id } = data;

            const result = await this.messages_service.deleteMessage(user_id, chat_id, message_id);
            this.server.to(chat_id).emit('message_deleted', {
                chat_id,
                message_id,
            });

            const recipient_id = result.recipient_id;
            if (recipient_id) {
                this.emitToUser(recipient_id, 'message_deleted', {
                    chat_id,
                    message_id,
                    message: result,
                });
            }

            return {
                event: 'message_deleted',
                data: result,
            };
        } catch (error) {
            return {
                event: 'error',
                data: { message: error.message || 'Failed to delete message' },
            };
        }
    }

    @SubscribeMessage('typing_start')
    async handleTypingStart(
        @ConnectedSocket() client: IAuthenticatedSocket,
        @MessageBody() data: { chat_id: string }
    ) {
        try {
            const user_id = client.user!.user_id;
            const { chat_id } = data;
            await this.messages_service.validateChatParticipation(user_id, chat_id);

            client.to(chat_id).emit('user_typing', {
                chat_id,
                user_id: user_id,
            });

            return {
                event: 'typing_started',
                data: { chat_id },
            };
        } catch (error) {
            return {
                event: 'error',
                data: { message: error.message || 'Failed to send typing indicator' },
            };
        }
    }

    @SubscribeMessage('typing_stop')
    async handleTypingStop(
        @ConnectedSocket() client: IAuthenticatedSocket,
        @MessageBody() data: { chat_id: string }
    ) {
        try {
            const user_id = client.user!.user_id;
            const { chat_id } = data;
            await this.messages_service.validateChatParticipation(user_id, chat_id);

            client.to(chat_id).emit('user_stopped_typing', {
                chat_id,
                user_id: user_id,
            });

            return {
                event: 'typing_stopped',
                data: { chat_id },
            };
        } catch (error) {
            return {
                event: 'error',
                data: { message: error.message || 'Failed to send typing stop indicator' },
            };
        }
    }

    // Helper method to emit to specific user (all their connected devices)
    emitToUser(user_id: string, event: string, data: any) {
        const socket_ids = this.userSockets.get(user_id);
        if (socket_ids) {
            socket_ids.forEach((socket_id) => {
                this.server.to(socket_id).emit(event, data);
            });
        }
    }
}

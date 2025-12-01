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
import { ChatRepository } from 'src/chat/chat.repository';
import { GetMessagesQueryDto, SendMessageDto, UpdateMessageDto } from './dto';
import { WsJwtGuard } from 'src/auth/guards/ws-jwt.guard';
import { PaginationService } from 'src/shared/services/pagination/pagination.service';

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
        private readonly chat_repository: ChatRepository,
        private readonly jwt_service: JwtService,
        private readonly config_service: ConfigService,
        private readonly pagination_service: PaginationService
    ) {}

    async handleConnection(client: IAuthenticatedSocket) {
        try {
            const user = WsJwtGuard.validateToken(client, this.jwt_service, this.config_service);
            client.user = user;
            const user_id = client.user.user_id;

            if (!this.userSockets.has(user_id)) {
                this.userSockets.set(user_id, new Set());
            }
            this.userSockets.get(user_id)?.add(client.id);

            console.log(`Client connected: ${client.id} (User: ${user_id})`);

            // Send unread messages count to newly connected client
            await this.sendUnreadChatsOnConnection(client, user_id);
        } catch (error) {
            console.error('Connection error:', error);
            client.disconnect();
        }
    }

    /**
     * Notify client about chats with unread messages when they connect
     * Frontend should then request full message history for these chats
     */
    private async sendUnreadChatsOnConnection(client: IAuthenticatedSocket, user_id: string) {
        try {
            const unread_chats = await this.messages_service.getUnreadChatsForUser(user_id);

            if (unread_chats.length > 0) {
                client.emit('unread_chats_summary', {
                    chats: unread_chats,
                    message: 'You have unread messages in these chats',
                });
            }
        } catch (error) {
            console.error('Error sending unread chats on connection:', error);
        }
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

            const chat = await this.messages_service.validateChatParticipation(user_id, chat_id);

            // Reset unread count for this user when they join the chat
            const unread_field =
                chat.user1_id === user_id ? 'unread_count_user1' : 'unread_count_user2';
            await this.chat_repository.update({ id: chat_id }, { [unread_field]: 0 });

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

            // Check if recipient is actively in the chat room
            const chat = await this.messages_service.validateChatParticipation(user_id, chat_id);
            const recipient_id = chat.user1_id === user_id ? chat.user2_id : chat.user1_id;
            console.log('Recipient ID:', recipient_id);
            const is_recipient_in_room = await this.isUserInChatRoom(recipient_id, chat_id);

            const result = await this.messages_service.sendMessage(
                user_id,
                chat_id,
                message,
                is_recipient_in_room
            );

            if (recipient_id) {
                this.emitToUser(recipient_id, 'new_message', {
                    chat_id,
                    message: result,
                });
            } else {
                this.server.to(chat_id).emit('new_message', {
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

            const recipient_id = result.recipient_id;
            if (recipient_id) {
                this.emitToUser(recipient_id, 'message_updated', {
                    chat_id,
                    message_id,
                    message: result,
                });
            } else {
                this.server.to(chat_id).emit('message_updated', {
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

            const recipient_id = result.recipient_id;
            if (recipient_id) {
                this.emitToUser(recipient_id, 'message_deleted', {
                    chat_id,
                    message_id,
                    message: result,
                });
            } else {
                this.server.to(chat_id).emit('message_deleted', {
                    chat_id,
                    message_id,
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

    @SubscribeMessage('get_messages')
    async handleGetMessages(
        @ConnectedSocket() client: IAuthenticatedSocket,
        @MessageBody() data: { chat_id: string; limit: number; cursor?: string }
    ) {
        try {
            const user_id = client.user!.user_id;
            const { chat_id, limit = 50, cursor } = data;
            const query: GetMessagesQueryDto = { limit, cursor };

            const result = await this.messages_service.getMessages(user_id, chat_id, query);
            const { next_cursor, has_more, ...response_data } = result;

            return {
                event: 'messages_retrieved',
                data: {
                    chat_id,
                    ...response_data,
                    has_more: result.messages.length === limit,
                    next_cursor,
                },
                pagination: {
                    next_cursor,
                    has_more,
                },
            };
        } catch (error) {
            return {
                event: 'error',
                data: { message: error.message || 'Failed to retrieve messages' },
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

    async isUserInChatRoom(user_id: string, chat_id: string): Promise<boolean> {
        const socket_ids = this.userSockets.get(user_id);
        if (!socket_ids) return false;
        // Check if any of the user's sockets are in the chat room
        const sockets_in_room = await this.server.in(chat_id).fetchSockets();
        const room_socket_ids = new Set(sockets_in_room.map((s) => s.id));

        for (const socket_id of socket_ids) {
            if (room_socket_ids.has(socket_id)) {
                console.log(`User ${user_id} is in chat room ${chat_id} via socket ${socket_id}`);
                return true;
            }
        }
        return false;
    }
}

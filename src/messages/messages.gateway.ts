import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { ChatRepository } from 'src/chat/chat.repository';
import { GetMessagesQueryDto, SendMessageDto, UpdateMessageDto } from './dto';
import { PaginationService } from 'src/shared/services/pagination/pagination.service';
import { path } from '@ffmpeg-installer/ffmpeg';
import { MESSAGE_CONTENT_LENGTH } from 'src/constants/variables';

@Injectable()
export class MessagesGateway {
    server: Server;
    // Store active connections: user_id -> socket_id[]
    private userSockets = new Map<string, Set<string>>();

    constructor(
        private readonly messages_service: MessagesService,
        private readonly chat_repository: ChatRepository,
        private readonly pagination_service: PaginationService
    ) {}

    setServer(server: Server) {
        this.server = server;
    }

    isOnline(user_id: string): boolean {
        return this.userSockets.has(user_id);
    }

    async onConnection(client: Socket, user_id: string) {
        if (!this.userSockets.has(user_id)) {
            this.userSockets.set(user_id, new Set());
        }
        this.userSockets.get(user_id)?.add(client.id);

        console.log(`MessagesGateway - Client connected: ${client.id} (User: ${user_id})`);

        // Send unread messages count to newly connected client
        await this.sendUnreadChatsOnConnection(client, user_id);
    }

    /**
     * Notify client about chats with unread messages when they connect
     * Frontend should then request full message history for these chats
     */
    private async sendUnreadChatsOnConnection(client: Socket, user_id: string) {
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

    onDisconnect(client: Socket, user_id: string | undefined) {
        if (user_id) {
            const user_socket_set = this.userSockets.get(user_id);
            if (user_socket_set) {
                user_socket_set.delete(client.id);
                if (user_socket_set.size === 0) {
                    this.userSockets.delete(user_id);
                }
            }
        }
        console.log(`MessagesGateway - Client disconnected: ${client.id}`);
    }

    async handleJoinChat(client: Socket, data: { chat_id: string }) {
        try {
            const user_id = client.data.user?.id;
            const { chat_id } = data;

            const { chat } = await this.messages_service.validateChatParticipation(
                user_id,
                chat_id
            );

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

    async handleLeaveChat(client: Socket, data: { chat_id: string }) {
        try {
            const { chat_id } = data;
            const user_id = client.data.user?.id;
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

    async handleSendMessage(client: Socket, data: { chat_id: string; message: SendMessageDto }) {
        try {
            const user_id = client.data.user?.id;
            const { chat_id, message } = data;

            // Validate message content length
            if (message.content.length > MESSAGE_CONTENT_LENGTH) {
                return {
                    event: 'error',
                    data: {
                        message: `Message content exceeds maximum length of ${MESSAGE_CONTENT_LENGTH} characters`,
                    },
                };
            }

            // Check if recipient is actively in the chat room
            const { chat } = await this.messages_service.validateChatParticipation(
                user_id,
                chat_id
            );
            const recipient_id = chat.user1_id === user_id ? chat.user2_id : chat.user1_id;
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

                this.emitToUser(
                    user_id,
                    'new_message',
                    {
                        chat_id,
                        message: result,
                    },
                    client.id
                );

                if (message.is_first_message) {
                    // If it's the first message, notify the front end to refresh chat list
                    this.emitToUser(
                        user_id,
                        'first_message',
                        {
                            chat_id,
                            message: result,
                        },
                        client.id
                    );

                    this.emitToUser(recipient_id, 'first_message', {
                        chat_id,
                        message: result,
                    });
                }
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

    async handleUpdateMessage(
        client: Socket,
        data: { chat_id: string; message_id: string; update: UpdateMessageDto }
    ) {
        try {
            const user_id = client.data.user?.id;
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

                this.emitToUser(
                    user_id,
                    'message_updated',
                    {
                        chat_id,
                        message_id,
                        message: result,
                    },
                    client.id
                );
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

    async handleDeleteMessage(client: Socket, data: { chat_id: string; message_id: string }) {
        try {
            const user_id = client.data.user?.id;
            const { chat_id, message_id } = data;

            const result = await this.messages_service.deleteMessage(user_id, chat_id, message_id);

            const recipient_id = result.recipient_id;
            if (recipient_id) {
                this.emitToUser(recipient_id, 'message_deleted', {
                    chat_id,
                    message_id,
                    message: result,
                });
                this.emitToUser(
                    user_id,
                    'message_deleted',
                    {
                        chat_id,
                        message_id,
                        message: result,
                    },
                    client.id
                );
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

    async handleTypingStart(client: Socket, data: { chat_id: string }) {
        try {
            const user_id = client.data.user?.id;
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

    async handleTypingStop(client: Socket, data: { chat_id: string }) {
        try {
            const user_id = client.data.user?.id;
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

    async handleGetMessages(
        client: Socket,
        data: { chat_id: string; limit: number; cursor?: string }
    ) {
        try {
            const user_id = client.data.user?.id;
            const { chat_id, limit = 50, cursor } = data;
            const query: GetMessagesQueryDto = { limit, cursor };

            const result = await this.messages_service.getMessages(user_id, chat_id, query);
            const { next_cursor, has_more, ...response_data } = result;

            return {
                event: 'messages_retrieved',
                data: {
                    chat_id,
                    ...response_data,
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
    emitToUser(user_id: string, event: string, data: any, exclude_socket_id?: string) {
        const socket_ids = this.userSockets.get(user_id);
        if (socket_ids) {
            socket_ids.forEach((socket_id) => {
                if (socket_id !== exclude_socket_id) {
                    this.server.to(socket_id).emit(event, data);
                }
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

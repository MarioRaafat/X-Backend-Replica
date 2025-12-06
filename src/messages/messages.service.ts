import {
    BadRequestException,
    ForbiddenException,
    forwardRef,
    Inject,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { MessageRepository } from './messages.repository';
import { GetMessagesQueryDto, SendMessageDto, UpdateMessageDto } from './dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Chat } from 'src/chat/entities/chat.entity';
import { ERROR_MESSAGES } from 'src/constants/swagger-messages';
import { MessageType } from './entities/message.entity';
import { ChatRepository } from 'src/chat/chat.repository';
import { PaginationService } from 'src/shared/services/pagination/pagination.service';
import { FCMService } from 'src/fcm/fcm.service';
import { NotificationType } from 'src/notifications/enums/notification-types';
import { MessagesGateway } from './messages.gateway';
import { MessageJobService } from 'src/background-jobs/notifications/message/message.service';

@Injectable()
export class MessagesService {
    constructor(
        private readonly message_repository: MessageRepository,
        @InjectRepository(Chat)
        private readonly chat_repository: ChatRepository,
        private readonly pagination_service: PaginationService,
        private readonly fcm_service: FCMService,
        @Inject(forwardRef(() => MessagesGateway))
        private readonly message_gateway: MessagesGateway,
        private readonly message_job_service: MessageJobService
    ) {}

    async validateChatParticipation(
        user_id: string,
        chat_id: string,
        content: string = '',
        message_id?: string
    ) {
        const chat = await this.chat_repository.findOne({
            where: { id: chat_id },
            relations: ['user1', 'user2'],
        });

        if (!chat) throw new NotFoundException(ERROR_MESSAGES.CHAT_NOT_FOUND);

        if (chat.user1_id !== user_id && chat.user2_id !== user_id) {
            throw new ForbiddenException(ERROR_MESSAGES.UNAUTHORIZED_ACCESS_TO_CHAT);
        }

        if (message_id) {
            const message = await this.message_repository.findMessageById(message_id);

            if (!message) throw new NotFoundException(ERROR_MESSAGES.MESSAGE_NOT_FOUND);
            if (message.chat_id !== chat_id)
                throw new BadRequestException(ERROR_MESSAGES.MESSAGE_DOES_NOT_BELONG_TO_CHAT);
            if (message.sender_id !== user_id)
                throw new ForbiddenException(ERROR_MESSAGES.UNAUTHORIZED_ACCESS_TO_MESSAGE);
        }

        if (content && content.trim().length === 0) {
            throw new BadRequestException(ERROR_MESSAGES.MESSAGE_CONTENT_REQUIRED);
        }

        const participant_id = chat.user1_id === user_id ? chat.user2_id : chat.user1_id;

        return { chat, participant_id };
    }

    async sendMessage(
        user_id: string,
        chat_id: string,
        dto: SendMessageDto,
        is_recipient_in_room: boolean = false
    ) {
        const { chat, participant_id } = await this.validateChatParticipation(
            user_id,
            chat_id,
            dto.content
        );

        // If it's a reply, validate the message being replied to
        if (dto.message_type === MessageType.REPLY && dto.reply_to_message_id) {
            const reply_to_message = await this.message_repository.findMessageById(
                dto.reply_to_message_id
            );

            if (!reply_to_message) {
                throw new NotFoundException(ERROR_MESSAGES.REPLY_TO_MESSAGE_NOT_FOUND);
            }
        }

        const message = await this.message_repository.createMessage(
            user_id,
            chat_id,
            dto,
            is_recipient_in_room
        );

        if (!is_recipient_in_room) {
            // Only increment unread count if recipient is NOT in the room
            const recipient_unread_field =
                chat.user1_id === user_id ? 'unread_count_user2' : 'unread_count_user1';
            await this.chat_repository.increment({ id: chat_id }, recipient_unread_field, 1);
        }

        // Send FCM notification if recipient is not in the room and is offline
        if (!is_recipient_in_room && !this.message_gateway.isOnline(participant_id)) {
            const sender = chat.user1_id === user_id ? chat.user1 : chat.user2;

            this.fcm_service.sendNotificationToUserDevice(
                participant_id,
                NotificationType.MESSAGE,
                {
                    content: dto.content,
                    sender: {
                        name: sender.name,
                        username: sender.username,
                    },
                }
            );
        } else if (!is_recipient_in_room && this.message_gateway.isOnline(participant_id)) {
            // Queue message notification job for online user not in room
            await this.message_job_service.queueMessageNotification({
                message,
                message_id: message.id,
                chat_id,
                sent_by: user_id,
                sent_to: participant_id,
            });
        }

        const recipient_id = chat.user1_id === user_id ? chat.user2_id : chat.user1_id;
        return {
            ...message,
            recipient_id,
        };
    }

    async getMessages(user_id: string, chat_id: string, query: GetMessagesQueryDto) {
        const { chat } = await this.validateChatParticipation(user_id, chat_id);
        let messages = await this.message_repository.findMessagesByChatId(chat_id, query);
        const other_user = chat.user1_id === user_id ? chat.user2 : chat.user1;

        let has_more = false;
        if (messages.length > query.limit) {
            has_more = true;
            messages.pop(); // Remove the extra message used to check for next page
        }

        const next_cursor = has_more
            ? this.pagination_service.generateNextCursor(messages, 'created_at', 'id')
            : null;

        messages = messages.reverse();

        return {
            next_cursor,
            has_more,
            sender: {
                id: other_user.id,
                username: other_user.username,
                name: other_user.name,
                avatar_url: other_user.avatar_url,
            },
            messages: messages.map((msg) => ({
                id: msg.id,
                content: msg.content,
                message_type: msg.message_type,
                reply_to: msg.reply_to_message_id,
                is_read: msg.is_read,
                is_edited: msg.is_edited,
                created_at: msg.created_at,
                updated_at: msg.updated_at,
                sender: {
                    id: msg.sender.id,
                    username: msg.sender.username,
                    name: msg.sender.name,
                    avatar_url: msg.sender.avatar_url,
                },
            })),
        };
    }

    async updateMessage(
        user_id: string,
        chat_id: string,
        message_id: string,
        dto: UpdateMessageDto
    ) {
        const { chat } = await this.validateChatParticipation(
            user_id,
            chat_id,
            dto.content,
            message_id
        );

        const updated_message = await this.message_repository.updateMessageContent(
            message_id,
            dto.content
        );

        const recipient_id = chat.user1_id === user_id ? chat.user2_id : chat.user1_id;

        return {
            id: updated_message.id,
            content: updated_message.content,
            message_type: updated_message.message_type,
            updated_at: updated_message.updated_at,
            is_edited: updated_message.is_edited,
            recipient_id,
        };
    }

    async deleteMessage(user_id: string, chat_id: string, message_id: string) {
        const { chat } = await this.validateChatParticipation(user_id, chat_id, '', message_id);
        const deleted_message = await this.message_repository.deleteMessage(message_id);
        const recipient_id = chat.user1_id === user_id ? chat.user2_id : chat.user1_id;

        return {
            id: deleted_message.id,
            is_deleted: deleted_message.is_deleted,
            deleted_at: deleted_message.deleted_at,
            recipient_id,
        };
    }

    async getUnreadChatsForUser(user_id: string) {
        const chats = await this.chat_repository.find({
            where: [{ user1_id: user_id }, { user2_id: user_id }],
            relations: ['user1', 'user2'],
        });

        const unread_chats = chats
            .filter((chat) => {
                const unread_count =
                    chat.user1_id === user_id ? chat.unread_count_user1 : chat.unread_count_user2;
                return unread_count > 0;
            })
            .map((chat) => {
                const other_user = chat.user1_id === user_id ? chat.user2 : chat.user1;
                const unread_count =
                    chat.user1_id === user_id ? chat.unread_count_user1 : chat.unread_count_user2;

                return {
                    chat_id: chat.id,
                    unread_count,
                    other_user: {
                        id: other_user.id,
                        username: other_user.username,
                        name: other_user.name,
                        avatar_url: other_user.avatar_url,
                    },
                    last_message_at: chat.updated_at,
                };
            });

        return unread_chats;
    }
}

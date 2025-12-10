import {
    BadRequestException,
    ForbiddenException,
    forwardRef,
    Inject,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { MessageRepository } from './messages.repository';
import {
    AddReactionDto,
    GetMessagesQueryDto,
    RemoveReactionDto,
    SendMessageDto,
    UpdateMessageDto,
} from './dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Chat } from 'src/chat/entities/chat.entity';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from 'src/constants/swagger-messages';
import { MessageType } from './entities/message.entity';
import { ChatRepository } from 'src/chat/chat.repository';
import { PaginationService } from 'src/shared/services/pagination/pagination.service';
import { EncryptionService } from 'src/shared/services/encryption/encryption.service';
import { FCMService } from 'src/fcm/fcm.service';
import { NotificationType } from 'src/notifications/enums/notification-types';
import { MessagesGateway } from './messages.gateway';
import { MessageJobService } from 'src/background-jobs/notifications/message/message.service';
import { AzureStorageService } from 'src/azure-storage/azure-storage.service';
import { ConfigService } from '@nestjs/config';
import {
    ALLOWED_IMAGE_MIME_TYPES,
    ALLOWED_VOICE_MIME_TYPES,
    MAX_IMAGE_FILE_SIZE,
    MAX_VOICE_DURATION,
    MAX_VOICE_FILE_SIZE,
    MIN_VOICE_DURATION,
} from 'src/constants/variables';
import { MessageReactionRepository } from './message-reaction.repository';

@Injectable()
export class MessagesService {
    private message_images_container: string;
    private message_voices_container: string;

    constructor(
        private readonly message_repository: MessageRepository,
        @InjectRepository(Chat)
        private readonly chat_repository: ChatRepository,
        private readonly pagination_service: PaginationService,
        private readonly encryption_service: EncryptionService,
        private readonly fcm_service: FCMService,
        @Inject(forwardRef(() => MessagesGateway))
        private readonly message_gateway: MessagesGateway,
        private readonly message_job_service: MessageJobService,
        private readonly azure_storage_service: AzureStorageService,
        private readonly config_service: ConfigService,
        private readonly message_reaction_repository: MessageReactionRepository
    ) {
        this.message_images_container =
            this.config_service.get<string>('AZURE_STORAGE_MESSAGE_IMAGE_CONTAINER') ||
            'message-images';
        this.message_voices_container =
            this.config_service.get<string>('AZURE_STORAGE_MESSAGE_VOICE_CONTAINER') ||
            'message-voices';
    }

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
            messages: messages.map((msg) => {
                // Group reactions by emoji and count
                const reaction_summary =
                    msg.reactions?.reduce(
                        (acc, reaction) => {
                            if (!acc[reaction.emoji]) {
                                acc[reaction.emoji] = {
                                    emoji: reaction.emoji,
                                    count: 0,
                                    reacted_by_me: false,
                                };
                            }
                            acc[reaction.emoji].count++;
                            if (reaction.user_id === user_id) {
                                acc[reaction.emoji].reacted_by_me = true;
                            }
                            return acc;
                        },
                        {} as Record<
                            string,
                            { emoji: string; count: number; reacted_by_me: boolean }
                        >
                    ) || {};

                return {
                    id: msg.id,
                    content: msg.content,
                    image_url: msg.image_url,
                    voice_note_url: msg.voice_note_url,
                    voice_note_duration: msg.voice_note_duration,
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
                    reactions: Object.values(reaction_summary),
                };
            }),
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

    async uploadMessageImage(
        user_id: string,
        file: Express.Multer.File
    ): Promise<{ image_url: string }> {
        if (!file || !file.buffer) {
            throw new BadRequestException(ERROR_MESSAGES.FILE_NOT_FOUND);
        }

        if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype as any)) {
            throw new BadRequestException(ERROR_MESSAGES.INVALID_FILE_FORMAT);
        }

        if (file.size > MAX_IMAGE_FILE_SIZE) {
            throw new BadRequestException(ERROR_MESSAGES.FILE_TOO_LARGE);
        }

        try {
            const file_name = this.azure_storage_service.generateFileName(
                user_id,
                file.originalname
            );

            const image_url = await this.azure_storage_service.uploadFile(
                file.buffer,
                file_name,
                this.message_images_container
            );

            return {
                image_url,
            };
        } catch (error) {
            throw new BadRequestException(ERROR_MESSAGES.FILE_UPLOAD_FAILED);
        }
    }

    async addReaction(user_id: string, chat_id: string, message_id: string, dto: AddReactionDto) {
        await this.validateChatParticipation(user_id, chat_id, '');

        const reaction = await this.message_reaction_repository.addReaction(
            message_id,
            user_id,
            dto.emoji
        );

        return {
            id: reaction.id,
            message_id: reaction.message_id,
            user_id: reaction.user_id,
            emoji: reaction.emoji,
            created_at: reaction.created_at,
        };
    }

    async removeReaction(
        user_id: string,
        chat_id: string,
        message_id: string,
        dto: RemoveReactionDto
    ) {
        await this.validateChatParticipation(user_id, chat_id, '');

        const removed = await this.message_reaction_repository.removeReaction(message_id, user_id);

        if (!removed) {
            throw new NotFoundException(ERROR_MESSAGES.REACTION_NOT_FOUND);
        }

        return {
            message: SUCCESS_MESSAGES.REACTION_REMOVED,
        };
    }

    async getMessageReactions(user_id: string, chat_id: string, message_id: string) {
        await this.validateChatParticipation(user_id, chat_id);

        const reactions = await this.message_reaction_repository.getMessageReactions(message_id);

        // Group reactions by emoji
        const grouped_reactions = reactions.reduce((acc, reaction) => {
            if (!acc[reaction.emoji]) {
                acc[reaction.emoji] = {
                    emoji: reaction.emoji,
                    count: 0,
                    users: [],
                    user_reacted: false,
                };
            }
            acc[reaction.emoji].count++;
            acc[reaction.emoji].users.push({
                id: reaction.user.id,
                username: reaction.user.username,
                name: reaction.user.name,
                avatar_url: reaction.user.avatar_url,
            });
            if (reaction.user_id === user_id) {
                acc[reaction.emoji].user_reacted = true;
            }
            return acc;
        }, {});

        return Object.values(grouped_reactions);
    }

    async uploadVoiceNote(
        user_id: string,
        file: Express.Multer.File,
        duration: string
    ): Promise<{ voice_note_url: string; duration: string }> {
        if (!file || !file.buffer) {
            throw new BadRequestException(ERROR_MESSAGES.FILE_NOT_FOUND);
        }

        if (!ALLOWED_VOICE_MIME_TYPES.includes(file.mimetype as any)) {
            throw new BadRequestException(ERROR_MESSAGES.INVALID_FILE_FORMAT);
        }

        if (file.size > MAX_VOICE_FILE_SIZE) {
            throw new BadRequestException(ERROR_MESSAGES.FILE_TOO_LARGE);
        }

        try {
            const file_name = this.azure_storage_service.generateFileName(
                user_id,
                file.originalname
            );

            const voice_note_url = await this.azure_storage_service.uploadFile(
                file.buffer,
                file_name,
                this.message_voices_container
            );

            return {
                voice_note_url,
                duration,
            };
        } catch (error) {
            throw new BadRequestException(ERROR_MESSAGES.FILE_UPLOAD_FAILED);
        }
    }

    async sendVoiceMessage(
        user_id: string,
        chat_id: string,
        voice_url: string,
        duration: string,
        is_first_message: boolean = false
    ): Promise<any> {
        const dto: SendMessageDto = {
            content: '',
            message_type: MessageType.VOICE,
            voice_note_url: voice_url,
            voice_note_duration: duration,
            is_first_message,
        };

        return this.sendMessage(user_id, chat_id, dto);
    }
}

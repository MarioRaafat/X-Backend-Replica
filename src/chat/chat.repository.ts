import {
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { DataSource, DeleteResult, Not, Repository } from 'typeorm';
import { InsertResult } from 'typeorm/browser';
import { CreateChatDto, GetChatsQueryDto, MarkMessagesReadDto } from './dto';
import { Chat } from './entities/chat.entity';
import { ERROR_MESSAGES } from 'src/constants/swagger-messages';
import { PaginationService } from '../shared/services/pagination/pagination.service';
import { UserRepository } from '../user/user.repository';

@Injectable()
export class ChatRepository extends Repository<Chat> {
    constructor(
        private data_source: DataSource,
        private pagination_service: PaginationService,
        private user_repository: UserRepository
    ) {
        super(Chat, data_source.createEntityManager());
    }

    async createChat(user_id: string, dto: CreateChatDto) {
        try {
            const { recipient_id } = dto;

            const recipient = await this.user_repository.findById(recipient_id);
            if (!recipient) {
                throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
            }

            const existing_chat = await this.findChat(user_id, recipient_id);

            if (existing_chat) {
                return existing_chat;
            } else {
                const new_chat = this.create({
                    user1_id: user_id,
                    user2_id: recipient_id,
                });
                return this.save(new_chat);
            }
        } catch (error) {
            console.error('Error in createChat repository method:', error);
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException(ERROR_MESSAGES.FAILED_TO_SAVE_IN_DB);
        }
    }

    async findChat(user1_id: string, user2_id: string): Promise<Chat | null> {
        try {
            const chat = await this.findOne({
                where: [
                    { user1_id: user1_id, user2_id: user2_id },
                    { user1_id: user2_id, user2_id: user1_id },
                ],
            });
            return chat;
        } catch (error) {
            console.error('Error in findChat repository method:', error);
            throw new InternalServerErrorException(ERROR_MESSAGES.FAILED_TO_FETCH_FROM_DB);
        }
    }

    async findChatById(chat_id: string): Promise<Chat | null> {
        const chat = await this.findOne({
            where: { id: chat_id },
        });
        return chat;
    }

    async getChats(user_id: string, query: GetChatsQueryDto) {
        try {
            const qb = this.createQueryBuilder('chat')
                .leftJoinAndSelect('chat.user1', 'user1')
                .leftJoinAndSelect('chat.user2', 'user2')
                .leftJoinAndSelect('chat.last_message', 'last_message')
                .where('(chat.user1_id = :user_id OR chat.user2_id = :user_id)', { user_id })
                .orderBy('last_message.created_at', 'DESC', 'NULLS LAST')
                .addOrderBy('chat.id', 'DESC')
                .take(query.limit + 1);

            // Apply cursor pagination manually to handle nullable last_message
            // Cursor format: last_message.created_at_chat.id (matching the ORDER BY)
            if (query?.cursor) {
                const [cursor_timestamp, cursor_chat_id] = query.cursor.split('_');
                if (cursor_timestamp && cursor_chat_id) {
                    const cursor_date = new Date(cursor_timestamp);
                    qb.andWhere(
                        `(
                            (date_trunc('milliseconds', last_message.created_at) < :cursor_date) OR
                            (date_trunc('milliseconds', last_message.created_at) = :cursor_date AND chat.id < :cursor_chat_id) OR
                            (last_message.created_at IS NULL AND date_trunc('milliseconds', chat.created_at) < :cursor_date) OR
                            (last_message.created_at IS NULL AND date_trunc('milliseconds', chat.created_at) = :cursor_date AND chat.id < :cursor_chat_id)
                          )`,
                        {
                            cursor_date,
                            cursor_chat_id,
                        }
                    );
                }
            }

            const chats = await qb.getMany();

            let has_more = false;
            if (chats.length > query.limit) {
                has_more = true;
                chats.pop();
            }

            // Generate cursor using last_message.created_at and chat.id (not last_message.id)
            const next_cursor =
                has_more && chats.length > 0
                    ? (() => {
                          const last_chat = chats[chats.length - 1];
                          let timestamp = last_chat.last_message?.created_at;
                          if (!timestamp) timestamp = last_chat.created_at;
                          const chat_id = last_chat.id;
                          if (!timestamp) return null;
                          const timestamp_iso =
                              timestamp instanceof Date
                                  ? timestamp.toISOString()
                                  : new Date(timestamp).toISOString();
                          return `${timestamp_iso}_${chat_id}`;
                      })()
                    : null;

            const result = chats.map((chat) => {
                const participant = chat.user1_id === user_id ? chat.user2 : chat.user1;
                const unread_count =
                    chat.user1_id === user_id ? chat.unread_count_user1 : chat.unread_count_user2;

                return {
                    id: chat.id,
                    participant: participant
                        ? {
                              id: participant.id,
                              username: participant.username,
                              name: participant.name,
                              avatar_url: participant.avatar_url,
                          }
                        : null,
                    last_message: chat.last_message
                        ? {
                              id: chat.last_message.id,
                              content: chat.last_message.content,
                              message_type: chat.last_message.message_type,
                              sender_id: chat.last_message.sender_id,
                              created_at: chat.last_message.created_at,
                              is_read: chat.last_message.is_read,
                          }
                        : null,
                    unread_count,
                    created_at: chat.created_at,
                    updated_at: chat.updated_at,
                };
            });

            return {
                data: result,
                next_cursor,
                has_more,
            };
        } catch (error) {
            throw new InternalServerErrorException(ERROR_MESSAGES.FAILED_TO_FETCH_FROM_DB);
        }
    }

    async updateChat(chat_id: string, update_data: Partial<Chat>): Promise<Chat> {
        try {
            await this.update(chat_id, update_data);
            const updated_chat = await this.findOne({ where: { id: chat_id } });
            if (!updated_chat) {
                throw new InternalServerErrorException(ERROR_MESSAGES.CHAT_NOT_FOUND);
            }
            return updated_chat;
        } catch (error) {
            throw new InternalServerErrorException(ERROR_MESSAGES.FAILED_TO_UPDATE_IN_DB);
        }
    }
}

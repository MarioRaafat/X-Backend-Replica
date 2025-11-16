import { Injectable } from '@nestjs/common';
import { MessageRepository } from './messages.repository';
import { GetMessagesQueryDto, SendMessageDto, UpdateMessageDto } from './dto';

@Injectable()
export class MessagesService {
    constructor(private readonly message_repository: MessageRepository) {}

    async searchMessages() {
        throw new Error('Method not implemented');
    }

    async sendMessage(user_id: string, chat_id: string, dto: SendMessageDto) {
        throw new Error('Method not implemented');
    }

    async getMessages(user_id: string, chat_id: string, query: GetMessagesQueryDto) {
        throw new Error('Method not implemented');
    }

    async getMessage(user_id: string, chat_id: string, message_id: string) {
        throw new Error('Method not implemented');
    }

    async updateMessage(
        user_id: string,
        chat_id: string,
        message_id: string,
        dto: UpdateMessageDto
    ) {
        throw new Error('Method not implemented');
    }

    async deleteMessage(user_id: string, chat_id: string, message_id: string) {
        throw new Error('Method not implemented');
    }
}

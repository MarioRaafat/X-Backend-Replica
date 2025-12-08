import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { MessageReaction } from './entities/message-reaction.entity';

@Injectable()
export class MessageReactionRepository {
    constructor(
        @InjectRepository(MessageReaction)
        private readonly repository: Repository<MessageReaction>
    ) {}

    async addReaction(
        message_id: string,
        user_id: string,
        emoji: string
    ): Promise<MessageReaction> {
        const existing_reaction = await this.repository.findOne({
            where: { message_id, user_id },
        });

        if (existing_reaction) {
            existing_reaction.emoji = emoji;
            return this.repository.save(existing_reaction);
        }

        return this.repository.save({
            message_id,
            user_id,
            emoji,
        });
    }

    async removeReaction(message_id: string, user_id: string): Promise<boolean> {
        const result = await this.repository.delete({
            message_id,
            user_id,
        });
        return (result.affected ?? 0) > 0;
    }

    async getMessageReactions(message_id: string): Promise<MessageReaction[]> {
        return this.repository.find({
            where: { message_id },
            relations: ['user'],
            order: { created_at: 'ASC' },
        });
    }

    async getReactionsByMessageIds(message_id: string): Promise<MessageReaction[]> {
        return this.repository.find({
            where: { message_id: message_id },
            relations: ['user'],
        });
    }
}

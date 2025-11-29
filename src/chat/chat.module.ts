import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chat } from './entities/chat.entity';
import { ChatRepository } from './chat.repository';
import { PaginationService } from '../shared/services/pagination/pagination.service';
import { Message } from '../messages/entities/message.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Chat, Message])],

    controllers: [ChatController],
    providers: [ChatService, ChatRepository, PaginationService],
    exports: [ChatRepository],
})
export class ChatModule {}

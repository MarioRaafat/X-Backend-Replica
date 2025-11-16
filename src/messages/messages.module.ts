import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { MessageRepository } from './messages.repository';
import { PaginationService } from 'src/shared/services/pagination/pagination.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './entities/message.entity';
import { Chat } from 'src/chat/entities/chat.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Message, Chat])],
    providers: [MessagesService, MessageRepository, PaginationService],
    controllers: [MessagesController],
})
export class MessagesModule {}

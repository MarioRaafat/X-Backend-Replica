import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { MessageRepository } from './messages.repository';
import { PaginationService } from 'src/shared/services/pagination/pagination.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './entities/message.entity';
import { Chat } from 'src/chat/entities/chat.entity';
import { MessagesGateway } from './messages.gateway';
import { JwtModule } from '@nestjs/jwt';
import { ChatModule } from 'src/chat/chat.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Message, Chat]),
        JwtModule.register({
            secret: process.env.JWT_TOKEN_SECRET,
            signOptions: { expiresIn: '7d' },
        }),
        ChatModule,
    ],
    providers: [MessagesService, MessageRepository, PaginationService, MessagesGateway],
    controllers: [MessagesController],
    exports: [MessagesService, MessagesGateway],
})
export class MessagesModule {}

import { forwardRef, Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { MessageRepository } from './messages.repository';
import { MessageReactionRepository } from './message-reaction.repository';
import { PaginationService } from 'src/shared/services/pagination/pagination.service';
import { EncryptionModule } from 'src/shared/services/encryption/encryption.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './entities/message.entity';
import { MessageReaction } from './entities/message-reaction.entity';
import { Chat } from 'src/chat/entities/chat.entity';
import { MessagesGateway } from './messages.gateway';
import { ChatModule } from 'src/chat/chat.module';
import { FcmModule } from 'src/fcm/fcm.module';
import { BackgroundJobsModule } from 'src/background-jobs';
import { AzureStorageModule } from 'src/azure-storage/azure-storage.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Message, Chat, MessageReaction]),
        ChatModule,
        FcmModule,
        AzureStorageModule,
        EncryptionModule,
        forwardRef(() => BackgroundJobsModule),
    ],
    providers: [
        MessagesService,
        MessageRepository,
        MessageReactionRepository,
        PaginationService,
        MessagesGateway,
    ],
    controllers: [MessagesController],
    exports: [MessagesService, MessagesGateway],
})
export class MessagesModule {}

import { forwardRef, Module } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Notification, NotificationSchema } from './entities/notifications.entity';
import { MongodbModule } from 'src/databases/mongodb.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entities';
import { Tweet } from 'src/tweets/entities';
import { BackgroundJobsModule } from 'src/background-jobs';
import { FcmModule } from 'src/expo/expo.module';
import { MessagesModule } from 'src/messages/messages.module';
import { Message } from 'src/messages/entities/message.entity';
import { TweetsModule } from 'src/tweets/tweets.module';

@Module({
    imports: [
        MongodbModule,
        MongooseModule.forFeature([{ name: Notification.name, schema: NotificationSchema }]),
        TypeOrmModule.forFeature([User, Tweet]),
        forwardRef(() => TweetsModule),
        forwardRef(() => BackgroundJobsModule),
        forwardRef(() => FcmModule),
        forwardRef(() => MessagesModule),
    ],
    providers: [NotificationsService, NotificationsGateway],
    exports: [NotificationsService, NotificationsGateway],
    controllers: [NotificationsController],
})
export class NotificationsModule {}

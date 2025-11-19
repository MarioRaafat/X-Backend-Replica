import { Module } from '@nestjs/common';
import { NotificationsGateway } from './gateway';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Notification, NotificationSchema } from './entities/notifications.entity';
import { MongodbModule } from 'src/databases/mongodb.module';

@Module({
    imports: [
        NotificationsGateway,
        MongodbModule,
        MongooseModule.forFeature([{ name: Notification.name, schema: NotificationSchema }]),
    ],
    // providers: [NotificationsService],
    // exports: [NotificationsService],
    // controllers: [NotificationsController],
})
export class NotificationsModule {}

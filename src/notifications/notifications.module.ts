import { Module } from '@nestjs/common';
import { NotificationsGateway } from './gateway';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Notification, NotificationSchema } from './entities/notifications.entity';
import { MongodbModule } from 'src/databases/mongodb.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
    imports: [
        MongodbModule,
        MongooseModule.forFeature([{ name: Notification.name, schema: NotificationSchema }]),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config_service: ConfigService) => ({
                secret: config_service.get('JWT_TOKEN_SECRET'),
                signOptions: { expiresIn: config_service.get('JWT_TOKEN_EXPIRES_IN') },
            }),
        }),
    ],
    providers: [NotificationsService, NotificationsGateway],
    exports: [NotificationsService, NotificationsGateway],
    // controllers: [NotificationsController],
})
export class NotificationsModule {}

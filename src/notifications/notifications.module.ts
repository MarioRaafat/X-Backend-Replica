import { forwardRef, Module } from '@nestjs/common';
import { NotificationsGateway } from './gateway';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Notification, NotificationSchema } from './entities/notifications.entity';
import { MongodbModule } from 'src/databases/mongodb.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entities';
import { Tweet } from 'src/tweets/entities';
import { BackgroundJobsModule } from 'src/background-jobs';

@Module({
    imports: [
        MongodbModule,
        MongooseModule.forFeature([{ name: Notification.name, schema: NotificationSchema }]),
        TypeOrmModule.forFeature([User, Tweet]),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config_service: ConfigService) => ({
                secret: config_service.get('JWT_TOKEN_SECRET'),
                signOptions: { expiresIn: config_service.get('JWT_TOKEN_EXPIRES_IN') },
            }),
        }),
        forwardRef(() => BackgroundJobsModule),
    ],
    providers: [NotificationsService, NotificationsGateway],
    exports: [NotificationsService, NotificationsGateway],
    controllers: [NotificationsController],
})
export class NotificationsModule {}

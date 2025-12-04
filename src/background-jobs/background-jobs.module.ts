import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CommunicationModule } from '../communication/communication.module';
import { QUEUE_NAMES } from './constants/queue.constants';
import { EmailProcessor } from './email/email.processor';
import { BackgroundJobsService } from './background-jobs';
import { EmailJobsController } from './email/email.controller';
import { EmailJobsService } from './email/email.service';
import { FollowJobService } from './notifications/follow/follow.service';
import { FollowProcessor } from './notifications/follow/follow.processor';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { NotificationsGateway } from 'src/notifications/gateway';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entities';
import { ReplyJobService } from './notifications/reply/reply.service';
import { ReplyProcessor } from './notifications/reply/reply.processor';
import { LikeJobService } from './notifications/like/like.service';
import { LikeProcessor } from './notifications/like/like.processor';
import { HashtagJobService } from './hashtag/hashtag.service';
import { HashtagProcessor } from './hashtag/hashtag.processor';
import { TrendModule } from 'src/trend/trend.module';

@Module({
    imports: [
        BullModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config_service: ConfigService) => ({
                redis: {
                    host: config_service.get<string>('REDIS_HOST'),
                    port: config_service.get<number>('REDIS_PORT'),
                    password: config_service.get<string>('REDIS_PASSWORD'),
                    username: config_service.get<string>('REDIS_USERNAME', ''),
                },
                defaultJobOptions: {
                    removeOnComplete: 10,
                    removeOnFail: 5,
                },
            }),
        }),
        BullModule.registerQueue({
            name: QUEUE_NAMES.EMAIL,
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
            },
        }),
        BullModule.registerQueue({
            name: QUEUE_NAMES.NOTIFICATION,
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
            },
        }),
        BullModule.registerQueue({
            name: QUEUE_NAMES.HASHTAG,
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
            },
        }),
        TypeOrmModule.forFeature([User]),
        CommunicationModule,
        NotificationsModule,
        TrendModule,
    ],
    controllers: [EmailJobsController],
    providers: [
        EmailProcessor,
        EmailJobsService,
        FollowProcessor,
        FollowJobService,
        ReplyJobService,
        ReplyProcessor,
        LikeJobService,
        LikeProcessor,
        HashtagJobService,
        HashtagProcessor,
    ],
    exports: [
        EmailJobsService,
        FollowJobService,
        BullModule,
        ReplyJobService,
        LikeJobService,
        HashtagJobService,
    ],
})
export class BackgroundJobsModule {}

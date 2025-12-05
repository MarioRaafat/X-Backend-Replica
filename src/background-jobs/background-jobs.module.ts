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
import { EsIndexTweetJobService } from './elasticsearch/es-index-tweet.service';
import { EsDeleteTweetJobService } from './elasticsearch/es-delete-tweet.service';
import { EsSyncProcessor } from './elasticsearch/es-sync.processor';
import { Tweet } from 'src/tweets/entities';
import { ElasticsearchModule } from 'src/elasticsearch/elasticsearch.module';
import { EsUpdateUserJobService } from './elasticsearch/es-update-user.service';
import { EsDeleteUserJobService } from './elasticsearch/es-delete-user.service';
import { EsFollowJobService } from './elasticsearch/es-follow.service';
import { AiSummaryJobService } from './ai-summary/ai-summary.service';
import { AiSummaryProcessor } from './ai-summary/ai-summary.processor';
import { TweetSummary } from 'src/tweets/entities/tweet-summary.entity';

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
            name: QUEUE_NAMES.ELASTICSEARCH,
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
            },
        }),
        BullModule.registerQueue({
            name: QUEUE_NAMES.AI_SUMMARY,
            defaultJobOptions: {
                attempts: 2,
                backoff: {
                    type: 'exponential',
                    delay: 3000,
                },
            },
        }),
        TypeOrmModule.forFeature([User]),
        TypeOrmModule.forFeature([Tweet]),
        TypeOrmModule.forFeature([TweetSummary]),
        CommunicationModule,
        NotificationsModule,
        ElasticsearchModule,
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
        EsIndexTweetJobService,
        EsDeleteTweetJobService,
        EsSyncProcessor,
        EsUpdateUserJobService,
        EsDeleteUserJobService,
        EsFollowJobService,
        AiSummaryJobService,
        AiSummaryProcessor,
    ],
    exports: [
        EmailJobsService,
        FollowJobService,
        BullModule,
        ReplyJobService,
        LikeJobService,
        EsIndexTweetJobService,
        EsDeleteTweetJobService,
        EsUpdateUserJobService,
        EsDeleteUserJobService,
        EsFollowJobService,
        AiSummaryJobService,
    ],
})
export class BackgroundJobsModule {}

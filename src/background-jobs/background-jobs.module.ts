import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { CommunicationModule } from '../communication/communication.module';
import { RedisModuleConfig } from '../redis/redis.module';
import { QUEUE_NAMES } from './constants/queue.constants';
import { EmailProcessor } from './email/email.processor';
import { TrendingScoreProcessor } from './processors/trending-score.processor';
import { BackgroundJobsService } from './background-jobs.service';
import { TrendingScoreService } from './services/trending-score.service';
import { TrendingScoreCron } from './cron/trending-score.cron';
import { BackgroundJobsController } from './background-jobs.controller';
import { Tweet } from '../tweets/entities/tweet.entity';
import { TweetCategory } from '../tweets/entities/tweet-category.entity';

@Module({
    imports: [
        ScheduleModule.forRoot(), // Enable cron jobs
        TypeOrmModule.forFeature([Tweet, TweetCategory]),
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
            name: QUEUE_NAMES.TRENDING,
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 5000,
                },
            },
        }),
        CommunicationModule,
        RedisModuleConfig,
    ],
    controllers: [BackgroundJobsController],
    providers: [
        EmailProcessor,
        TrendingScoreProcessor,
        BackgroundJobsService,
        TrendingScoreService,
        TrendingScoreCron,
    ],
    exports: [BackgroundJobsService, TrendingScoreService, TrendingScoreCron, BullModule],
})
export class BackgroundJobsModule {}

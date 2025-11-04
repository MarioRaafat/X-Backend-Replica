import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CommunicationModule } from '../communication/communication.module';
import { QUEUE_NAMES } from './constants/queue.constants';
import { EmailProcessor } from './email/email.processor';
import { BackgroundJobsService } from './background-jobs.service';
import { BackgroundJobsController } from './background-jobs.controller';

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
        CommunicationModule,
    ],
    controllers: [BackgroundJobsController],
    providers: [EmailProcessor, BackgroundJobsService],
    exports: [BackgroundJobsService, BullModule],
})
export class BackgroundJobsModule {}

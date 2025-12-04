import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { PostgreSQLModule } from './databases/postgresql.module';
import { RedisModuleConfig } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { VerificationModule } from './verification/verification.module';
import { CommunicationModule } from './communication/communication.module';
import { LoggerMiddleware } from './middlewares/logger.middleware';
import { NotificationsModule } from './notifications/notifications.module';
import { TimelineModule } from './timeline/timeline.module';
import { SearchModule } from './search/search.module';
import { ExploreModule } from './explore/explore.module';
import { TweetsModule } from './tweets/tweets.module';
import { ChatModule } from './chat/chat.module';
import { CategoryModule } from './category/category.module';
import { BackgroundJobsModule } from './background-jobs/background-jobs.module';
import { AzureStorageModule } from './azure-storage/azure-storage.module';
import { MessagesModule } from './messages/messages.module';
import { TrendModule } from './trend/trend.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: 'config/.env',
        }),
        PostgreSQLModule,
        RedisModuleConfig,
        AuthModule,
        UserModule,
        VerificationModule,
        CommunicationModule,
        NotificationsModule,

        SearchModule,
        ExploreModule,
        TweetsModule,

        ChatModule,
        TimelineModule,
        CategoryModule,
        BackgroundJobsModule,
        AzureStorageModule,
        MessagesModule,
        TrendModule,
        ScheduleModule.forRoot(),
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(LoggerMiddleware).forRoutes('*');
    }
}

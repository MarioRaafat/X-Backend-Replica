import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserBlocks, UserFollows, UserMutes } from './entities';
import { UserInterests } from './entities/user-interests.entity';
import { UserRepository } from './user.repository';
import { ConfigModule } from '@nestjs/config';
import { AzureStorageModule } from 'src/azure-storage/azure-storage.module';
import { CategoryModule } from 'src/category/category.module';
import { TweetsModule } from 'src/tweets/tweets.module';
import { PaginationService } from 'src/shared/services/pagination/pagination.service';
import { UsernameService } from 'src/auth/username.service';
import { FollowJobService } from 'src/background-jobs/notifications/follow/follow.service';
import { BackgroundJobsModule } from 'src/background-jobs';
import { CommunicationModule } from 'src/communication/communication.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([User, UserFollows, UserBlocks, UserMutes, UserInterests]),
        ConfigModule,
        AzureStorageModule,
        CategoryModule,
        TweetsModule,
        BackgroundJobsModule,
    ],
    controllers: [UserController],
    providers: [UserService, UserRepository, PaginationService, UsernameService, FollowJobService],
    exports: [UserRepository, UserService],
})
export class UserModule {}

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

@Module({
    imports: [
        TypeOrmModule.forFeature([User, UserFollows, UserBlocks, UserMutes, UserInterests]),
        ConfigModule,
        AzureStorageModule,
        CategoryModule,
        TweetsModule,
    ],
    controllers: [UserController],
    providers: [UserService, UserRepository, PaginationService],
})
export class UserModule {}

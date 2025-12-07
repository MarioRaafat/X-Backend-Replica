import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExploreController } from './explore.controller';
import { ExploreService } from './explore.service';
import { RedisModuleConfig } from '../redis/redis.module';
import { Category } from '../category/entities/category.entity';
import { TweetsModule } from '../tweets/tweets.module';
import { UserInterests } from 'src/user/entities/user-interests.entity';
import { UserModule } from '../user/user.module';

@Module({
    imports: [
        RedisModuleConfig,
        TypeOrmModule.forFeature([Category, UserInterests]),
        TweetsModule,
        UserModule,
    ],
    controllers: [ExploreController],
    providers: [ExploreService],
    exports: [ExploreService],
})
export class ExploreModule {}

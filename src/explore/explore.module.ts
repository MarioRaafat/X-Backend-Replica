import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExploreController } from './explore.controller';
import { ExploreService } from './explore.service';
import { WhoToFollowService } from './who-to-follow.service';
import { RedisModuleConfig } from '../redis/redis.module';
import { Category } from '../category/entities/category.entity';
import { TweetsModule } from '../tweets/tweets.module';
import { UserInterests } from 'src/user/entities/user-interests.entity';
import { UserModule } from '../user/user.module';
import { TrendModule } from 'src/trend/trend.module';

@Module({
    imports: [
        RedisModuleConfig,
        TypeOrmModule.forFeature([Category, UserInterests]),
        TweetsModule,
        UserModule,
        TrendModule,
    ],
    controllers: [ExploreController],
    providers: [ExploreService, WhoToFollowService],
    exports: [ExploreService, WhoToFollowService],
})
export class ExploreModule {}

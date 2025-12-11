import { forwardRef, Module } from '@nestjs/common';
import { TrendService } from './trend.service';
import { TrendController } from './trend.controller';
import { RedisService } from 'src/redis/redis.service';
import { VelocityExponentialDetector } from './velocity-exponential-detector';
import { Hashtag } from 'src/tweets/entities/hashtags.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FakeTrendService } from './fake-trend.service';
import { User } from 'src/user/entities/user.entity';
import { TweetsModule } from 'src/tweets/tweets.module';

@Module({
    controllers: [TrendController],
    imports: [TypeOrmModule.forFeature([Hashtag, User]), forwardRef(() => TweetsModule)],

    providers: [TrendService, RedisService, VelocityExponentialDetector, FakeTrendService],
    exports: [TrendService, FakeTrendService],
})
export class TrendModule {}

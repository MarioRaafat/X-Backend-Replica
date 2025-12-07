import { Module } from '@nestjs/common';
import { TrendService } from './trend.service';
import { TrendController } from './trend.controller';
import { RedisService } from 'src/redis/redis.service';
import { VelocityExponentialDetector } from './velocity-exponential-detector';
import { Hashtag } from 'src/tweets/entities/hashtags.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
    controllers: [TrendController],
    imports: [TypeOrmModule.forFeature([Hashtag])],

    providers: [TrendService, RedisService, VelocityExponentialDetector],
    exports: [TrendService],
})
export class TrendModule {}

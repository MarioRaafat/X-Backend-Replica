import { Module } from '@nestjs/common';
import { TrendService } from './trend.service';
import { TrendController } from './trend.controller';
import { RedisService } from 'src/redis/redis.service';

@Module({
    controllers: [TrendController],
    providers: [TrendService, RedisService],
    exports: [TrendService],
})
export class TrendModule {}

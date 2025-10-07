import { RedisModule } from '@nestjs-modules/ioredis';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

@Module({
    imports: [
        ConfigModule,
        RedisModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config_service: ConfigService) => ({
                type: 'single',
                url: `redis://${config_service.get<string>('REDIS_USERNAME', '')}:${config_service.get<string>('REDIS_PASSWORD')}@${config_service.get<string>('REDIS_HOST')}:${config_service.get<string>('REDIS_PORT')}`,
                // url: `redis://${config_service.get<string>('REDIS_HOST')}:${config_service.get<string>('REDIS_PORT')}`,
            }),
        }),
    ],
    providers: [ConfigService, RedisService],
})
export class RedisModuleConfig {}

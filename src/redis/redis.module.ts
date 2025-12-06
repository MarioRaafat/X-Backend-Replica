import { RedisModule } from '@nestjs-modules/ioredis';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

@Global()
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
                options: {
                    maxRetriesPerRequest: 3,
                    enableReadyCheck: true,
                    enableOfflineQueue: false,
                    lazyConnect: false,
                },
            }),
        }),
    ],
    providers: [ConfigService, RedisService],
    exports: [RedisService],
})
export class RedisModuleConfig {}

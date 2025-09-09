import { RedisModule } from '@nestjs-modules/ioredis';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'single',
        url: `redis://${config.get<string>('REDIS_USERNAME', '')}:${config.get<string>('REDIS_PASSWORD')}@${config.get<string>('REDIS_HOST')}:${config.get<string>('REDIS_PORT')}`,
        // url: `redis://${config.get<string>('REDIS_HOST')}:${config.get<string>('REDIS_PORT')}`,
      }),
    }),
  ],
  providers: [ConfigService],
})
export class RedisModuleConfig {}

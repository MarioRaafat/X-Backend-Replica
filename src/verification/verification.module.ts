import { Module } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { RedisModule } from '@nestjs-modules/ioredis';
import { RedisService } from 'src/redis/redis.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
    imports: [
        RedisModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (config_service: ConfigService) => ({
                secret: config_service.get('NOT_ME_LINK_SECRET'),
                signOptions: {
                    expiresIn: config_service.get('NOT_ME_LINK_EXPIRATION_TIME'),
                },
            }),
            inject: [ConfigService],
        }),
    ],
    providers: [VerificationService, RedisService],
})
export class VerificationModule {}

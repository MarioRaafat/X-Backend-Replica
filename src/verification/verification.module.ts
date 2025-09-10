import { Module } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { RedisModule } from '@nestjs-modules/ioredis';
import { RedisService } from 'src/redis/redis.service';

@Module({
  imports: [RedisModule],
  providers: [VerificationService, RedisService],
})
export class VerificationModule {}

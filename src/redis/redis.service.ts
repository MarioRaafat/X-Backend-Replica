import { InjectRedis } from '@nestjs-modules/ioredis';
import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
    constructor(@InjectRedis() private readonly redis: Redis) {}

    async get(key: string): Promise<string | null> {
        return this.redis.get(key);
    }

    async set(key: string, value: string, ttlSeconds?: number): Promise<'OK'> {
        if (ttlSeconds) {
        return this.redis.set(key, value, 'EX', ttlSeconds);
        }
        return this.redis.set(key, value);
    }

    async del(key: string): Promise<number> {
        return this.redis.del(key);
    }

    async exists(key: string): Promise<boolean> {
        const res = await this.redis.exists(key);
        return res === 1;
    }
}

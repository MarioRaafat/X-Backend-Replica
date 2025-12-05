import { InjectRedis } from '@nestjs-modules/ioredis';
import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
    constructor(@InjectRedis() private readonly redis_client: Redis) {}

    async get(key: string): Promise<string | null> {
        return this.redis_client.get(key);
    }

    async set(key: string, value: string, ttl_seconds?: number): Promise<'OK'> {
        if (ttl_seconds) {
            return this.redis_client.set(key, value, 'EX', ttl_seconds);
        }
        return this.redis_client.set(key, value);
    }

    async del(key: string): Promise<number> {
        return this.redis_client.del(key);
    }

    async exists(key: string): Promise<boolean> {
        const result = await this.redis_client.exists(key);
        return result === 1;
    }

    async hset(
        key: string,
        value: Record<string, string>,
        ttl_seconds: number = 60 * 60 * 1 // 1 hour default
    ) {
        await this.redis_client.hset(key, value);
        await this.redis_client.expire(key, ttl_seconds);
    }

    async hget(key: string): Promise<Record<string, string> | null> {
        const hash_data = await this.redis_client.hgetall(key);
        if (Object.keys(hash_data).length === 0) {
            return null;
        }
        return hash_data;
    }

    async sadd(key: string, jti: string) {
        await this.redis_client.sadd(key, jti);
    }

    async expire(key: string, ttl: number) {
        await this.redis_client.expire(key, ttl);
    }

    async srem(key: string, jti: string) {
        await this.redis_client.srem(key, jti);
    }

    async smembers(key: string): Promise<string[]> {
        return await this.redis_client.smembers(key);
    }

    async acquireLock(key: string, ttlms: number): Promise<boolean> {
        const lockKey = `lock:tweet_summary${key}`;
        const result = await this.redis_client.set(lockKey, 'locked', 'PX', ttlms, 'NX');
        return result === 'OK';
    }

    pipeline() {
        return this.redis_client.pipeline();
    }
}

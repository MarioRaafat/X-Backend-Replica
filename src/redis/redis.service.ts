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

    // Sorted Set  operations for trending
    //push tweet_id with score to  redis  to its category sorted set
    async zadd(key: string, score: number, member: string): Promise<number> {
        return this.redis_client.zadd(key, score, member);
    }
    //get range from sorted set
    async zrevrange(key: string, start: number, stop: number): Promise<string[]> {
        return this.redis_client.zrevrange(key, start, stop);
    }

    //get with scores (in case needed)
    async zrevrangeWithScores(key: string, start: number, stop: number): Promise<Array<string>> {
        return this.redis_client.zrevrange(key, start, stop, 'WITHSCORES');
    }
    //set range the one ranked stop + 1 will be excluded
    async zremrangebyrank(key: string, start: number, stop: number): Promise<number> {
        return this.redis_client.zremrangebyrank(key, start, stop);
    }

    async zrevrangeMultiple(keys: string[], start: number, stop: number): Promise<Array<string[]>> {
        const pipeline = this.redis_client.pipeline();
        keys.forEach((key) => {
            pipeline.zrevrange(key, start, stop, 'WITHSCORES');
        });

        const results = await pipeline.exec();
        if (!results) return [];

        return results.map(([err, result]) => {
            if (err) {
                return [];
            }
            return result as string[];
        });
    }

    pipeline() {
        return this.redis_client.pipeline();
    }
}

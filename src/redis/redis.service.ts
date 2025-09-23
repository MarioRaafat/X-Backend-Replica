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

  async hset(
    key: string,
    value: Record<string, string>,
    ttlSeconds: number = 600,
  ) {
    await this.redis.hset(key, value);
    await this.redis.expire(key, ttlSeconds);
  }

  async hget(key: string): Promise<Record<string, string> | null> {
    const hash = await this.redis.hgetall(key);
    if (Object.keys(hash).length === 0) {
      return null;
    }
    return hash;
  }
}

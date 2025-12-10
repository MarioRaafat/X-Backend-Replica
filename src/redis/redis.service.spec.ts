import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service';
import Redis from 'ioredis';

describe('RedisService', () => {
    let service: RedisService;
    let mock_redis_client: jest.Mocked<Redis>;

    beforeEach(async () => {
        mock_redis_client = {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            exists: jest.fn(),
            expire: jest.fn(),
            hset: jest.fn(),
            hgetall: jest.fn(),
            sadd: jest.fn(),
            srem: jest.fn(),
            smembers: jest.fn(),
            pipeline: jest.fn(),
        } as any;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RedisService,
                {
                    provide: 'default_IORedisModuleConnectionToken',
                    useValue: mock_redis_client,
                },
            ],
        }).compile();

        service = module.get<RedisService>(RedisService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('get', () => {
        it('should retrieve value from Redis', async () => {
            const test_value = 'test_value';
            mock_redis_client.get.mockResolvedValue(test_value);

            const result = await service.get('test_key');

            expect(result).toBe(test_value);
            expect(mock_redis_client.get).toHaveBeenCalledWith('test_key');
        });

        it('should return null for non-existent key', async () => {
            mock_redis_client.get.mockResolvedValue(null);

            const result = await service.get('non_existent');

            expect(result).toBeNull();
        });
    });

    describe('set', () => {
        it('should set value in Redis without TTL', async () => {
            mock_redis_client.set.mockResolvedValue('OK');

            await service.set('test_key', 'test_value');

            expect(mock_redis_client.set).toHaveBeenCalledWith('test_key', 'test_value');
        });

        it('should set value in Redis with TTL', async () => {
            mock_redis_client.set.mockResolvedValue('OK');

            await service.set('test_key', 'test_value', 3600);

            expect(mock_redis_client.set).toHaveBeenCalledWith(
                'test_key',
                'test_value',
                'EX',
                3600
            );
        });

        it('should handle string values', async () => {
            mock_redis_client.set.mockResolvedValue('OK');

            await service.set('counter', '123');

            expect(mock_redis_client.set).toHaveBeenCalledWith('counter', '123');
        });
    });

    describe('del', () => {
        it('should delete key from Redis', async () => {
            mock_redis_client.del.mockResolvedValue(1);

            const result = await service.del('test_key');

            expect(result).toBe(1);
            expect(mock_redis_client.del).toHaveBeenCalledWith('test_key');
        });

        it('should return 0 for non-existent key', async () => {
            mock_redis_client.del.mockResolvedValue(0);

            const result = await service.del('non_existent');

            expect(result).toBe(0);
        });
    });

    describe('exists', () => {
        it('should return true if key exists', async () => {
            mock_redis_client.exists.mockResolvedValue(1);

            const result = await service.exists('test_key');

            expect(result).toBe(true);
            expect(mock_redis_client.exists).toHaveBeenCalledWith('test_key');
        });

        it('should return false if key does not exist', async () => {
            mock_redis_client.exists.mockResolvedValue(0);

            const result = await service.exists('non_existent');

            expect(result).toBe(false);
        });
    });

    describe('hset', () => {
        it('should set hash value with default TTL', async () => {
            const hash_value = { field1: 'value1', field2: 'value2' };
            mock_redis_client.hset.mockResolvedValue(2);
            mock_redis_client.expire.mockResolvedValue(1);

            await service.hset('test_hash', hash_value);

            expect(mock_redis_client.hset).toHaveBeenCalledWith('test_hash', hash_value);
            expect(mock_redis_client.expire).toHaveBeenCalledWith('test_hash', 3600);
        });

        it('should set hash value with custom TTL', async () => {
            const hash_value = { user_id: '123', username: 'testuser' };
            mock_redis_client.hset.mockResolvedValue(2);
            mock_redis_client.expire.mockResolvedValue(1);

            await service.hset('test_hash', hash_value, 7200);

            expect(mock_redis_client.hset).toHaveBeenCalledWith('test_hash', hash_value);
            expect(mock_redis_client.expire).toHaveBeenCalledWith('test_hash', 7200);
        });
    });

    describe('hget', () => {
        it('should retrieve hash value', async () => {
            const hash_data = { field1: 'value1', field2: 'value2' };
            mock_redis_client.hgetall.mockResolvedValue(hash_data);

            const result = await service.hget('test_hash');

            expect(result).toEqual(hash_data);
            expect(mock_redis_client.hgetall).toHaveBeenCalledWith('test_hash');
        });

        it('should return null for non-existent hash', async () => {
            mock_redis_client.hgetall.mockResolvedValue({});

            const result = await service.hget('non_existent');

            expect(result).toBeNull();
        });

        it('should return null for empty hash', async () => {
            mock_redis_client.hgetall.mockResolvedValue({});

            const result = await service.hget('empty_hash');

            expect(result).toBeNull();
        });
    });

    describe('sadd', () => {
        it('should add member to set', async () => {
            mock_redis_client.sadd.mockResolvedValue(1);

            await service.sadd('test_set', 'jti_token_123');

            expect(mock_redis_client.sadd).toHaveBeenCalledWith('test_set', 'jti_token_123');
        });

        it('should add multiple members to set', async () => {
            mock_redis_client.sadd.mockResolvedValue(1);

            await service.sadd('blacklist', 'token_1');
            await service.sadd('blacklist', 'token_2');

            expect(mock_redis_client.sadd).toHaveBeenCalledTimes(2);
        });
    });

    describe('expire', () => {
        it('should set expiration time for key', async () => {
            mock_redis_client.expire.mockResolvedValue(1);

            await service.expire('test_key', 1800);

            expect(mock_redis_client.expire).toHaveBeenCalledWith('test_key', 1800);
        });
    });

    describe('srem', () => {
        it('should remove member from set', async () => {
            mock_redis_client.srem.mockResolvedValue(1);

            await service.srem('test_set', 'jti_token_123');

            expect(mock_redis_client.srem).toHaveBeenCalledWith('test_set', 'jti_token_123');
        });

        it('should return 0 when removing non-existent member', async () => {
            mock_redis_client.srem.mockResolvedValue(0);

            await service.srem('test_set', 'non_existent');

            expect(mock_redis_client.srem).toHaveBeenCalledWith('test_set', 'non_existent');
        });
    });

    describe('smembers', () => {
        it('should retrieve all members from set', async () => {
            const members = ['jti_1', 'jti_2', 'jti_3'];
            mock_redis_client.smembers.mockResolvedValue(members);

            const result = await service.smembers('test_set');

            expect(result).toEqual(members);
            expect(mock_redis_client.smembers).toHaveBeenCalledWith('test_set');
        });

        it('should return empty array for empty set', async () => {
            mock_redis_client.smembers.mockResolvedValue([]);

            const result = await service.smembers('empty_set');

            expect(result).toEqual([]);
        });

        it('should return empty array for non-existent set', async () => {
            mock_redis_client.smembers.mockResolvedValue([]);

            const result = await service.smembers('non_existent');

            expect(result).toEqual([]);
        });
    });

    describe('zadd', () => {
        it('should add member to sorted set with score', async () => {
            (mock_redis_client as any).zadd = jest.fn().mockResolvedValue(1);

            const result = await service.zadd('trending:tech', 100, 'tweet-123');

            expect(result).toBe(1);
            expect((mock_redis_client as any).zadd).toHaveBeenCalledWith(
                'trending:tech',
                100,
                'tweet-123'
            );
        });

        it('should update score for existing member', async () => {
            (mock_redis_client as any).zadd = jest.fn().mockResolvedValue(0);

            const result = await service.zadd('trending:sports', 250, 'tweet-456');

            expect(result).toBe(0);
        });
    });

    describe('zrevrange', () => {
        it('should return top members from sorted set', async () => {
            const expected_tweets = ['tweet-1', 'tweet-2', 'tweet-3'];
            (mock_redis_client as any).zrevrange = jest.fn().mockResolvedValue(expected_tweets);

            const result = await service.zrevrange('trending:music', 0, 3);

            expect(result).toEqual(expected_tweets);
            expect((mock_redis_client as any).zrevrange).toHaveBeenCalledWith(
                'trending:music',
                0,
                2
            );
        });

        it('should handle offset and limit correctly', async () => {
            (mock_redis_client as any).zrevrange = jest
                .fn()
                .mockResolvedValue(['tweet-4', 'tweet-5']);

            await service.zrevrange('trending:all', 3, 2);

            expect((mock_redis_client as any).zrevrange).toHaveBeenCalledWith('trending:all', 3, 4);
        });

        it('should return empty array for non-existent set', async () => {
            (mock_redis_client as any).zrevrange = jest.fn().mockResolvedValue([]);

            const result = await service.zrevrange('non_existent', 0, 10);

            expect(result).toEqual([]);
        });
    });

    describe('zremrangebyrank', () => {
        it('should remove range by rank from sorted set', async () => {
            (mock_redis_client as any).zremrangebyrank = jest.fn().mockResolvedValue(5);

            const result = await service.zremrangebyrank('trending:tech', 100, -1);

            expect(result).toBe(5);
            expect((mock_redis_client as any).zremrangebyrank).toHaveBeenCalledWith(
                'trending:tech',
                100,
                -1
            );
        });

        it('should return 0 when no members removed', async () => {
            (mock_redis_client as any).zremrangebyrank = jest.fn().mockResolvedValue(0);

            const result = await service.zremrangebyrank('trending:sports', 1000, 2000);

            expect(result).toBe(0);
        });
    });

    describe('zrevrangeMultiple', () => {
        it('should return results from multiple sorted sets', async () => {
            const mock_pipeline = {
                zrevrange: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([
                    [null, ['tweet-1', 'tweet-2']],
                    [null, ['tweet-3', 'tweet-4']],
                    [null, ['tweet-5']],
                ]),
            };
            (mock_redis_client as any).pipeline = jest.fn().mockReturnValue(mock_pipeline);

            const result = await service.zrevrangeMultiple(
                ['trending:tech', 'trending:sports', 'trending:music'],
                0,
                2
            );

            expect(result).toEqual([['tweet-1', 'tweet-2'], ['tweet-3', 'tweet-4'], ['tweet-5']]);
            expect(mock_pipeline.zrevrange).toHaveBeenCalledTimes(3);
            expect(mock_pipeline.zrevrange).toHaveBeenCalledWith('trending:tech', 0, 1);
            expect(mock_pipeline.zrevrange).toHaveBeenCalledWith('trending:sports', 0, 1);
            expect(mock_pipeline.zrevrange).toHaveBeenCalledWith('trending:music', 0, 1);
        });

        it('should handle errors in pipeline execution', async () => {
            const mock_pipeline = {
                zrevrange: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([
                    [null, ['tweet-1']],
                    [new Error('Redis error'), null],
                    [null, ['tweet-3']],
                ]),
            };
            (mock_redis_client as any).pipeline = jest.fn().mockReturnValue(mock_pipeline);

            const result = await service.zrevrangeMultiple(['key1', 'key2', 'key3'], 0, 5);

            expect(result).toEqual([['tweet-1'], [], ['tweet-3']]);
        });

        it('should return empty array when pipeline returns null', async () => {
            const mock_pipeline = {
                zrevrange: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue(null),
            };
            (mock_redis_client as any).pipeline = jest.fn().mockReturnValue(mock_pipeline);

            const result = await service.zrevrangeMultiple(['key1'], 0, 10);

            expect(result).toEqual([]);
        });

        it('should handle empty keys array', async () => {
            const mock_pipeline = {
                zrevrange: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([]),
            };
            (mock_redis_client as any).pipeline = jest.fn().mockReturnValue(mock_pipeline);

            const result = await service.zrevrangeMultiple([], 0, 10);

            expect(result).toEqual([]);
            expect(mock_pipeline.zrevrange).not.toHaveBeenCalled();
        });
    });

    describe('pipeline', () => {
        it('should return pipeline instance', () => {
            const mock_pipeline = {
                get: jest.fn(),
                set: jest.fn(),
                exec: jest.fn(),
            };
            mock_redis_client.pipeline.mockReturnValue(mock_pipeline as any);

            const result = service.pipeline();

            expect(result).toBe(mock_pipeline);
            expect(mock_redis_client.pipeline).toHaveBeenCalled();
        });
    });
});

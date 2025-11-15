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

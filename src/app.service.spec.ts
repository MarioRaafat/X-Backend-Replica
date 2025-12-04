import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './user/entities/user.entity';
import { Tweet } from './tweets/entities/tweet.entity';
import { UserFollows } from './user/entities/user-follows.entity';
import { TweetLike } from './tweets/entities/tweet-like.entity';
import { TweetReply } from './tweets/entities/tweet-reply.entity';
import { AzureStorageService } from './azure-storage/azure-storage.service';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { TweetType } from './shared/enums/tweet-types.enum';

jest.mock('bcrypt');

describe('AppService', () => {
    let service: AppService;
    let user_repository: jest.Mocked<Repository<User>>;
    let tweet_repository: jest.Mocked<Repository<Tweet>>;
    let user_follows_repository: jest.Mocked<Repository<UserFollows>>;
    let tweet_like_repository: jest.Mocked<Repository<TweetLike>>;
    let tweet_reply_repository: jest.Mocked<Repository<TweetReply>>;
    let azure_storage_service: jest.Mocked<AzureStorageService>;
    let config_service: jest.Mocked<ConfigService>;

    const mock_user_repository = {
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
        createQueryBuilder: jest.fn(),
    };

    const mock_tweet_repository = {
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
        increment: jest.fn(),
        createQueryBuilder: jest.fn(),
    };

    const mock_user_follows_repository = {
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        createQueryBuilder: jest.fn(),
    };

    const mock_tweet_like_repository = {
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        createQueryBuilder: jest.fn(),
    };

    const mock_tweet_reply_repository = {
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        createQueryBuilder: jest.fn(),
    };

    const mock_azure_storage_service = {
        generateFileName: jest.fn(),
        uploadFile: jest.fn(),
    };

    const mock_config_service = {
        get: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AppService,
                {
                    provide: getRepositoryToken(User),
                    useValue: mock_user_repository,
                },
                {
                    provide: getRepositoryToken(Tweet),
                    useValue: mock_tweet_repository,
                },
                {
                    provide: getRepositoryToken(UserFollows),
                    useValue: mock_user_follows_repository,
                },
                {
                    provide: getRepositoryToken(TweetLike),
                    useValue: mock_tweet_like_repository,
                },
                {
                    provide: getRepositoryToken(TweetReply),
                    useValue: mock_tweet_reply_repository,
                },
                {
                    provide: AzureStorageService,
                    useValue: mock_azure_storage_service,
                },
                {
                    provide: ConfigService,
                    useValue: mock_config_service,
                },
            ],
        }).compile();

        service = module.get<AppService>(AppService);
        user_repository = module.get(getRepositoryToken(User));
        tweet_repository = module.get(getRepositoryToken(Tweet));
        user_follows_repository = module.get(getRepositoryToken(UserFollows));
        tweet_like_repository = module.get(getRepositoryToken(TweetLike));
        tweet_reply_repository = module.get(getRepositoryToken(TweetReply));
        azure_storage_service = module.get(AzureStorageService);
        config_service = module.get(ConfigService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getHealthStatus', () => {
        it('should return health status message', () => {
            const result = service.getHealthStatus();
            expect(result).toBe('Application is running');
        });
    });

    describe('uploadAvatar', () => {
        it('should upload avatar successfully', async () => {
            const file = {
                buffer: Buffer.from('test'),
                originalname: 'avatar.jpg',
            } as Express.Multer.File;

            const image_name = 'test-user-avatar.jpg';
            const image_url = 'https://storage.azure.com/avatar.jpg';
            const container_name = 'profile-images';

            mock_azure_storage_service.generateFileName.mockReturnValue(image_name);
            mock_azure_storage_service.uploadFile.mockResolvedValue(image_url);
            mock_config_service.get.mockReturnValue(container_name);

            const result = await service.uploadAvatar('test-user', file);

            expect(mock_azure_storage_service.generateFileName).toHaveBeenCalledWith(
                'test-user',
                'avatar.jpg'
            );
            expect(mock_azure_storage_service.uploadFile).toHaveBeenCalledWith(
                file.buffer,
                image_name,
                container_name
            );
            expect(result).toEqual({
                image_url,
                image_name,
            });
        });

        it('should throw BadRequestException if file is missing', async () => {
            const file = null as any;

            await expect(service.uploadAvatar('test-user', file)).rejects.toThrow(
                BadRequestException
            );
        });

        it('should throw BadRequestException if file buffer is missing', async () => {
            const file = {
                originalname: 'avatar.jpg',
            } as Express.Multer.File;

            await expect(service.uploadAvatar('test-user', file)).rejects.toThrow(
                BadRequestException
            );
        });

        it('should throw InternalServerErrorException on upload error', async () => {
            const file = {
                buffer: Buffer.from('test'),
                originalname: 'avatar.jpg',
            } as Express.Multer.File;

            mock_azure_storage_service.generateFileName.mockReturnValue('test.jpg');
            mock_config_service.get.mockReturnValue('container');
            mock_azure_storage_service.uploadFile.mockRejectedValue(new Error('Upload failed'));

            await expect(service.uploadAvatar('test-user', file)).rejects.toThrow(
                InternalServerErrorException
            );
        });
    });

    describe('seedTestData', () => {
        it('should create new users if they do not exist', async () => {
            const mock_user = {
                id: 'user-1',
                email: 'test@example.com',
                username: 'testuser',
                name: 'Test User',
            } as User;

            mock_user_repository.findOne.mockResolvedValue(null);
            mock_user_repository.create.mockReturnValue(mock_user);
            mock_user_repository.save.mockResolvedValue(mock_user);
            mock_tweet_repository.findOne.mockResolvedValue(null);
            mock_tweet_repository.create.mockReturnValue({} as Tweet);
            mock_tweet_repository.save.mockResolvedValue({
                tweet_id: 'tweet-1',
                content: 'Test tweet',
            } as Tweet);
            mock_user_follows_repository.findOne.mockResolvedValue(null);
            mock_user_follows_repository.create.mockReturnValue({} as UserFollows);
            mock_user_follows_repository.save.mockResolvedValue({} as UserFollows);

            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

            const result = await service.seedTestData();

            expect(result).toHaveProperty('users');
            expect(result).toHaveProperty('tweets');
            expect(result).toHaveProperty('follows');
            expect(result).toHaveProperty('replies');
            expect(result).toHaveProperty('likes');
            expect(mock_user_repository.create).toHaveBeenCalled();
            expect(mock_user_repository.save).toHaveBeenCalled();
        });

        it('should return existing users if they already exist', async () => {
            const mock_user = {
                id: 'user-1',
                email: 'test@example.com',
                username: 'testuser',
                name: 'Test User',
            } as User;

            mock_user_repository.findOne.mockResolvedValue(mock_user);
            mock_tweet_repository.findOne.mockResolvedValue({
                tweet_id: 'tweet-1',
                content: 'Existing tweet',
            } as Tweet);
            mock_user_follows_repository.findOne.mockResolvedValue({} as UserFollows);

            const result = await service.seedTestData();

            expect(result.users[0].action).toBe('already_exists');
            expect(mock_user_repository.create).not.toHaveBeenCalled();
        });
    });

    describe('clearTestData', () => {
        it('should clear all test data successfully', async () => {
            const mock_users = [
                { id: 'user-1', email: 'test1@example.com' },
                { id: 'user-2', email: 'test2@example.com' },
            ] as User[];

            const mock_tweets = [
                { tweet_id: 'tweet-1', user_id: 'user-1' },
                { tweet_id: 'tweet-2', user_id: 'user-2' },
            ] as Tweet[];

            mock_user_repository.find.mockResolvedValue(mock_users);
            mock_tweet_repository.find.mockResolvedValue(mock_tweets);

            const mock_query_builder = {
                delete: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                execute: jest.fn().mockResolvedValue({ affected: 1 }),
            };

            mock_user_follows_repository.createQueryBuilder.mockReturnValue(
                mock_query_builder as any
            );
            mock_tweet_like_repository.createQueryBuilder.mockReturnValue(
                mock_query_builder as any
            );
            mock_tweet_reply_repository.createQueryBuilder.mockReturnValue(
                mock_query_builder as any
            );
            mock_tweet_repository.createQueryBuilder.mockReturnValue(mock_query_builder as any);
            mock_user_repository.createQueryBuilder.mockReturnValue(mock_query_builder as any);

            const result = await service.clearTestData();

            expect(result.message).toBe('Test data cleared successfully');
            expect(result.deleted).toHaveProperty('users');
            expect(result.deleted).toHaveProperty('tweets');
            expect(result.deleted).toHaveProperty('follows');
            expect(result.deleted).toHaveProperty('likes');
            expect(result.deleted).toHaveProperty('replies');
        });

        it('should return zero counts if no test data found', async () => {
            mock_user_repository.find.mockResolvedValue([]);

            const result = await service.clearTestData();

            expect(result.message).toBe('No test data found to delete');
            expect(result.deleted.users).toBe(0);
            expect(result.deleted.tweets).toBe(0);
        });
    });
});

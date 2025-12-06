import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './user/entities/user.entity';
import { Tweet } from './tweets/entities/tweet.entity';
import { UserFollows } from './user/entities/user-follows.entity';
import { TweetLike } from './tweets/entities/tweet-like.entity';
import { TweetReply } from './tweets/entities/tweet-reply.entity';
import { AzureStorageService } from './azure-storage/azure-storage.service';
import { ConfigService } from '@nestjs/config';

describe('AppController', () => {
    let app_controller: AppController;
    let app_service: AppService;

    beforeEach(async () => {
        const mock_repo = (): Record<string, jest.Mock> => ({
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            delete: jest.fn(),
            update: jest.fn(),
            preload: jest.fn(),
            insert: jest.fn(),
            increment: jest.fn(),
            decrement: jest.fn(),
            createQueryBuilder: jest.fn(),
        });

        const mock_azure_storage_service = {
            uploadFile: jest.fn(),
            deleteFile: jest.fn(),
            getFileUrl: jest.fn(),
        };

        const mock_config_service = {
            get: jest.fn(),
        };

        const app: TestingModule = await Test.createTestingModule({
            controllers: [AppController],
            providers: [
                AppService,
                { provide: getRepositoryToken(User), useValue: mock_repo() },
                { provide: getRepositoryToken(Tweet), useValue: mock_repo() },
                { provide: getRepositoryToken(UserFollows), useValue: mock_repo() },
                { provide: getRepositoryToken(TweetLike), useValue: mock_repo() },
                { provide: getRepositoryToken(TweetReply), useValue: mock_repo() },
                { provide: AzureStorageService, useValue: mock_azure_storage_service },
                { provide: ConfigService, useValue: mock_config_service },
            ],
        }).compile();

        app_controller = app.get<AppController>(AppController);
        app_service = app.get<AppService>(AppService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(app_controller).toBeDefined();
        expect(app_service).toBeDefined();
    });

    describe('checkHealth', () => {
        it('should return application health status', () => {
            const result = app_controller.checkHealth();
            expect(result).toBe('Application is running');
        });

        it('should call app_service.getHealthStatus', () => {
            const get_health_status_spy = jest.spyOn(app_service, 'getHealthStatus');

            app_controller.checkHealth();

            expect(get_health_status_spy).toHaveBeenCalledTimes(1);
        });

        it('should return the exact string from service', () => {
            const mock_status = 'Custom health message';
            jest.spyOn(app_service, 'getHealthStatus').mockReturnValue(mock_status);

            const result = app_controller.checkHealth();

            expect(result).toBe(mock_status);
        });
    });
});

import { TestController } from './app.controller';
import { BadRequestException } from '@nestjs/common';

describe('TestController', () => {
    let test_controller: TestController;
    let app_service: AppService;

    beforeEach(async () => {
        const mock_repo = (): Record<string, jest.Mock> => ({
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            delete: jest.fn(),
            update: jest.fn(),
            preload: jest.fn(),
            insert: jest.fn(),
            increment: jest.fn(),
            decrement: jest.fn(),
            createQueryBuilder: jest.fn(),
        });

        const mock_azure_storage_service = {
            uploadFile: jest.fn(),
            deleteFile: jest.fn(),
            getFileUrl: jest.fn(),
            generateFileName: jest.fn(),
        };

        const mock_config_service = {
            get: jest.fn().mockReturnValue('test-container'),
        };

        const app: TestingModule = await Test.createTestingModule({
            controllers: [TestController],
            providers: [
                AppService,
                { provide: getRepositoryToken(User), useValue: mock_repo() },
                { provide: getRepositoryToken(Tweet), useValue: mock_repo() },
                { provide: getRepositoryToken(UserFollows), useValue: mock_repo() },
                { provide: getRepositoryToken(TweetLike), useValue: mock_repo() },
                { provide: getRepositoryToken(TweetReply), useValue: mock_repo() },
                { provide: AzureStorageService, useValue: mock_azure_storage_service },
                { provide: ConfigService, useValue: mock_config_service },
            ],
        }).compile();

        test_controller = app.get<TestController>(TestController);
        app_service = app.get<AppService>(AppService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(test_controller).toBeDefined();
        expect(app_service).toBeDefined();
    });

    describe('seedTestData', () => {
        it('should seed test data successfully', async () => {
            const mock_result = {
                users: [
                    {
                        action: 'created' as const,
                        email: 'test@example.com',
                        username: 'testuser',
                        name: 'Test User',
                        user_id: 'user-1',
                    },
                ],
                tweets: [
                    {
                        action: 'created' as const,
                        username: 'testuser',
                        content: 'Test tweet',
                        tweet_id: 'tweet-1',
                    },
                ],
                follows: {
                    action: 'Each user follows all other users',
                    affected_count: 10,
                },
                replies: {
                    action: 'Replies created between main 3 users',
                    affected_count: 5,
                },
                likes: {
                    action: 'Likes created between main 3 users',
                    affected_count: 8,
                },
            };

            jest.spyOn(app_service, 'seedTestData').mockResolvedValue(mock_result);

            const result = await test_controller.seedTestData();

            expect(result).toEqual(mock_result);
            expect(app_service.seedTestData).toHaveBeenCalledTimes(1);
        });

        it('should handle errors during seeding', async () => {
            jest.spyOn(app_service, 'seedTestData').mockRejectedValue(new Error('Seeding failed'));

            await expect(test_controller.seedTestData()).rejects.toThrow('Seeding failed');
        });
    });

    describe('clearTestData', () => {
        it('should clear test data successfully', async () => {
            const mock_result = {
                message: 'Test data cleared successfully',
                deleted: {
                    users: 10,
                    tweets: 50,
                    follows: 45,
                    likes: 30,
                    replies: 20,
                },
            };

            jest.spyOn(app_service, 'clearTestData').mockResolvedValue(mock_result);

            const result = await test_controller.clearTestData();

            expect(result).toEqual(mock_result);
            expect(app_service.clearTestData).toHaveBeenCalledTimes(1);
        });

        it('should return zero counts when no data exists', async () => {
            const mock_result = {
                message: 'No test data found to delete',
                deleted: {
                    users: 0,
                    tweets: 0,
                    follows: 0,
                    likes: 0,
                    replies: 0,
                },
            };

            jest.spyOn(app_service, 'clearTestData').mockResolvedValue(mock_result);

            const result = await test_controller.clearTestData();

            expect(result).toEqual(mock_result);
        });
    });

    describe('uploadTestImages', () => {
        it('should upload image with correct password', async () => {
            const mock_file = {
                buffer: Buffer.from('test'),
                originalname: 'test.jpg',
            } as Express.Multer.File;

            const mock_result = {
                image_url: 'https://example.com/test.jpg',
                image_name: 'test-team-test.jpg',
            };

            jest.spyOn(app_service, 'uploadAvatar').mockResolvedValue(mock_result);

            const result = await test_controller.uploadTestImages(mock_file, 'test team only');

            expect(result).toEqual(mock_result);
            expect(app_service.uploadAvatar).toHaveBeenCalledWith('test-team', mock_file);
        });

        it('should throw BadRequestException with incorrect password', async () => {
            const mock_file = {
                buffer: Buffer.from('test'),
                originalname: 'test.jpg',
            } as Express.Multer.File;

            await expect(
                test_controller.uploadTestImages(mock_file, 'wrong password')
            ).rejects.toThrow('Invalid password');
        });

        it('should throw BadRequestException with empty password', async () => {
            const mock_file = {
                buffer: Buffer.from('test'),
                originalname: 'test.jpg',
            } as Express.Multer.File;

            await expect(test_controller.uploadTestImages(mock_file, '')).rejects.toThrow(
                'Invalid password'
            );
        });
    });
});

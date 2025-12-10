import { Test, TestingModule } from '@nestjs/testing';
import { RepostProcessor } from './repost.processor';
import { NotificationsService } from 'src/notifications/notifications.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from 'src/user/entities';
import { Tweet } from 'src/tweets/entities';
import { Repository } from 'typeorm';
import { Job } from 'bull';
import { RepostBackGroundNotificationJobDTO } from './repost.dto';
import { NotificationType } from 'src/notifications/enums/notification-types';

describe('RepostProcessor', () => {
    let processor: RepostProcessor;
    let notifications_service: jest.Mocked<NotificationsService>;
    let user_repository: jest.Mocked<Repository<User>>;
    let tweet_repository: jest.Mocked<Repository<Tweet>>;

    const mock_job = (
        data: Partial<RepostBackGroundNotificationJobDTO>
    ): Job<RepostBackGroundNotificationJobDTO> =>
        ({
            id: 'test-job-id',
            data: data as RepostBackGroundNotificationJobDTO,
        }) as Job<RepostBackGroundNotificationJobDTO>;

    beforeEach(async () => {
        const mock_notifications_service = {
            removeRepostNotification: jest.fn(),
            sendNotificationOnly: jest.fn(),
            saveNotificationAndSend: jest.fn(),
        };

        const mock_user_repository = {
            findOne: jest.fn(),
        };

        const mock_tweet_repository = {
            findOne: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RepostProcessor,
                {
                    provide: NotificationsService,
                    useValue: mock_notifications_service,
                },
                {
                    provide: getRepositoryToken(User),
                    useValue: mock_user_repository,
                },
                {
                    provide: getRepositoryToken(Tweet),
                    useValue: mock_tweet_repository,
                },
            ],
        }).compile();

        processor = module.get<RepostProcessor>(RepostProcessor);
        notifications_service = module.get(NotificationsService);
        user_repository = module.get(getRepositoryToken(User));
        tweet_repository = module.get(getRepositoryToken(Tweet));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('handleSendRepostNotification - add action', () => {
        it('should process repost notification successfully', async () => {
            const mock_reposter = {
                id: 'reposter-id',
                username: 'reposter',
                email: 'reposter@test.com',
                name: 'Reposter',
                avatar_url: 'avatar.jpg',
            };

            const mock_tweet = {
                tweet_id: 'tweet-123',
                text: 'Original tweet',
                user_id: 'repost-to-id',
            };

            user_repository.findOne.mockResolvedValue(mock_reposter as User);

            const job = mock_job({
                repost_to: 'repost-to-id',
                reposted_by: 'reposter-id',
                tweet_id: 'tweet-123',
                tweet: mock_tweet as any,
                action: 'add',
            });

            await processor.handleSendRepostNotification(job);

            expect(user_repository.findOne).toHaveBeenCalledWith({
                where: { id: 'reposter-id' },
                select: ['username', 'email', 'name', 'avatar_url'],
            });
            expect(notifications_service.saveNotificationAndSend).toHaveBeenCalledWith(
                'repost-to-id',
                expect.objectContaining({
                    type: NotificationType.REPOST,
                    tweet_id: 'tweet-123',
                    reposted_by: 'reposter-id',
                }),
                expect.objectContaining({
                    type: NotificationType.REPOST,
                })
            );
        });

        it('should log warning when reposter not found', async () => {
            const logger_spy = jest.spyOn(processor['logger'], 'warn');
            user_repository.findOne.mockResolvedValue(null);

            const mock_tweet = {
                tweet_id: 'tweet-123',
                text: 'Original tweet',
            };

            const job = mock_job({
                repost_to: 'repost-to-id',
                reposted_by: 'reposter-id',
                tweet_id: 'tweet-123',
                tweet: mock_tweet as any,
                action: 'add',
            });

            await processor.handleSendRepostNotification(job);

            expect(logger_spy).toHaveBeenCalledWith(
                expect.stringContaining('Reposter with ID reposter-id not found')
            );
            expect(notifications_service.saveNotificationAndSend).not.toHaveBeenCalled();
        });

        it('should log warning when tweet not provided', async () => {
            const logger_spy = jest.spyOn(processor['logger'], 'warn');

            const mock_reposter = {
                id: 'reposter-id',
                username: 'reposter',
                email: 'reposter@test.com',
                name: 'Reposter',
                avatar_url: 'avatar.jpg',
            };

            user_repository.findOne.mockResolvedValue(mock_reposter as User);

            const job = mock_job({
                repost_to: 'repost-to-id',
                reposted_by: 'reposter-id',
                tweet_id: 'tweet-123',
                action: 'add',
            });

            await processor.handleSendRepostNotification(job);

            expect(logger_spy).toHaveBeenCalledWith(
                expect.stringContaining('Tweet with ID tweet-123 not found')
            );
            expect(notifications_service.saveNotificationAndSend).not.toHaveBeenCalled();
        });
    });

    describe('handleSendRepostNotification - remove action', () => {
        it('should remove repost notification successfully with tweet entity found', async () => {
            const mock_tweet_entity = {
                tweet_id: 'tweet-123',
                user_id: 'actual-owner-id',
            };

            tweet_repository.findOne.mockResolvedValue(mock_tweet_entity as Tweet);
            notifications_service.removeRepostNotification.mockResolvedValue(true);

            const job = mock_job({
                repost_to: 'repost-to-id',
                reposted_by: 'reposter-id',
                tweet_id: 'tweet-123',
                action: 'remove',
            });

            await processor.handleSendRepostNotification(job);

            expect(tweet_repository.findOne).toHaveBeenCalledWith({
                where: { tweet_id: 'tweet-123' },
                select: ['user_id'],
            });
            expect(notifications_service.removeRepostNotification).toHaveBeenCalledWith(
                'actual-owner-id',
                'tweet-123',
                'reposter-id'
            );
            expect(notifications_service.sendNotificationOnly).toHaveBeenCalledWith(
                NotificationType.REPOST,
                'actual-owner-id',
                expect.objectContaining({
                    reposted_by: 'reposter-id',
                })
            );
        });

        it('should use repost_to when tweet entity not found', async () => {
            const logger_spy = jest.spyOn(processor['logger'], 'warn');
            tweet_repository.findOne.mockResolvedValue(null);
            notifications_service.removeRepostNotification.mockResolvedValue(true);

            const job = mock_job({
                repost_to: 'repost-to-id',
                reposted_by: 'reposter-id',
                tweet_id: 'tweet-123',
                action: 'remove',
            });

            await processor.handleSendRepostNotification(job);

            expect(logger_spy).toHaveBeenCalledWith(
                expect.stringContaining('Tweet with ID tweet-123 not found')
            );
            expect(notifications_service.removeRepostNotification).toHaveBeenCalledWith(
                'repost-to-id',
                'tweet-123',
                'reposter-id'
            );
            expect(notifications_service.sendNotificationOnly).toHaveBeenCalledWith(
                NotificationType.REPOST,
                'repost-to-id',
                expect.any(Object)
            );
        });

        it('should not send notification if removal failed', async () => {
            const mock_tweet_entity = {
                tweet_id: 'tweet-123',
                user_id: 'actual-owner-id',
            };

            tweet_repository.findOne.mockResolvedValue(mock_tweet_entity as Tweet);
            notifications_service.removeRepostNotification.mockResolvedValue(false);

            const job = mock_job({
                repost_to: 'repost-to-id',
                reposted_by: 'reposter-id',
                tweet_id: 'tweet-123',
                action: 'remove',
            });

            await processor.handleSendRepostNotification(job);

            expect(notifications_service.removeRepostNotification).toHaveBeenCalled();
            expect(notifications_service.sendNotificationOnly).not.toHaveBeenCalled();
        });

        it('should handle missing tweet_id during removal', async () => {
            tweet_repository.findOne.mockResolvedValue(null);

            const job = mock_job({
                repost_to: 'repost-to-id',
                reposted_by: 'reposter-id',
                action: 'remove',
            });

            await processor.handleSendRepostNotification(job);

            // findOne is still called even with undefined tweet_id
            expect(tweet_repository.findOne).toHaveBeenCalled();
            // But removeRepostNotification should not be called because tweet_id is falsy
            expect(notifications_service.removeRepostNotification).not.toHaveBeenCalled();
            expect(notifications_service.sendNotificationOnly).not.toHaveBeenCalled();
        });
    });

    describe('error handling', () => {
        it('should log and throw error on database failure', async () => {
            const logger_spy = jest.spyOn(processor['logger'], 'error');
            const error = new Error('Database connection failed');
            user_repository.findOne.mockRejectedValue(error);

            const mock_tweet = {
                tweet_id: 'tweet-123',
                text: 'Original tweet',
            };

            const job = mock_job({
                repost_to: 'repost-to-id',
                reposted_by: 'reposter-id',
                tweet_id: 'tweet-123',
                tweet: mock_tweet as any,
                action: 'add',
            });

            await expect(processor.handleSendRepostNotification(job)).rejects.toThrow(error);
            expect(logger_spy).toHaveBeenCalledWith(
                expect.stringContaining('Error processing repost job'),
                error
            );
        });

        it('should handle error during notification save', async () => {
            const mock_reposter = {
                id: 'reposter-id',
                username: 'reposter',
                email: 'reposter@test.com',
                name: 'Reposter',
                avatar_url: 'avatar.jpg',
            };

            const mock_tweet = {
                tweet_id: 'tweet-123',
                text: 'Original tweet',
            };

            user_repository.findOne.mockResolvedValue(mock_reposter as User);

            const error = new Error('Save failed');
            notifications_service.saveNotificationAndSend.mockRejectedValue(error);

            const job = mock_job({
                repost_to: 'repost-to-id',
                reposted_by: 'reposter-id',
                tweet_id: 'tweet-123',
                tweet: mock_tweet as any,
                action: 'add',
            });

            await expect(processor.handleSendRepostNotification(job)).rejects.toThrow(error);
        });

        it('should handle error during notification removal', async () => {
            const mock_tweet_entity = {
                tweet_id: 'tweet-123',
                user_id: 'actual-owner-id',
            };

            tweet_repository.findOne.mockResolvedValue(mock_tweet_entity as Tweet);

            const error = new Error('Removal failed');
            notifications_service.removeRepostNotification.mockRejectedValue(error);

            const job = mock_job({
                repost_to: 'repost-to-id',
                reposted_by: 'reposter-id',
                tweet_id: 'tweet-123',
                action: 'remove',
            });

            await expect(processor.handleSendRepostNotification(job)).rejects.toThrow(error);
        });
    });
});

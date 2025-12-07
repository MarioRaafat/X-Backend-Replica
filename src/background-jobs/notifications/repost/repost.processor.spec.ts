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
    let notificationsService: jest.Mocked<NotificationsService>;
    let userRepository: jest.Mocked<Repository<User>>;
    let tweetRepository: jest.Mocked<Repository<Tweet>>;

    const mockJob = (
        data: Partial<RepostBackGroundNotificationJobDTO>
    ): Job<RepostBackGroundNotificationJobDTO> =>
        ({
            id: 'test-job-id',
            data: data as RepostBackGroundNotificationJobDTO,
        }) as Job<RepostBackGroundNotificationJobDTO>;

    beforeEach(async () => {
        const mockNotificationsService = {
            removeRepostNotification: jest.fn(),
            sendNotificationOnly: jest.fn(),
            saveNotificationAndSend: jest.fn(),
        };

        const mockUserRepository = {
            findOne: jest.fn(),
        };

        const mockTweetRepository = {
            findOne: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RepostProcessor,
                {
                    provide: NotificationsService,
                    useValue: mockNotificationsService,
                },
                {
                    provide: getRepositoryToken(User),
                    useValue: mockUserRepository,
                },
                {
                    provide: getRepositoryToken(Tweet),
                    useValue: mockTweetRepository,
                },
            ],
        }).compile();

        processor = module.get<RepostProcessor>(RepostProcessor);
        notificationsService = module.get(NotificationsService);
        userRepository = module.get(getRepositoryToken(User));
        tweetRepository = module.get(getRepositoryToken(Tweet));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('handleSendRepostNotification - add action', () => {
        it('should process repost notification successfully', async () => {
            const mockReposter = {
                id: 'reposter-id',
                username: 'reposter',
                email: 'reposter@test.com',
                name: 'Reposter',
                avatar_url: 'avatar.jpg',
            };

            const mockTweet = {
                tweet_id: 'tweet-123',
                text: 'Original tweet',
                user_id: 'repost-to-id',
            };

            userRepository.findOne.mockResolvedValue(mockReposter as User);

            const job = mockJob({
                repost_to: 'repost-to-id',
                reposted_by: 'reposter-id',
                tweet_id: 'tweet-123',
                tweet: mockTweet as any,
                action: 'add',
            });

            await processor.handleSendRepostNotification(job);

            expect(userRepository.findOne).toHaveBeenCalledWith({
                where: { id: 'reposter-id' },
                select: ['username', 'email', 'name', 'avatar_url'],
            });
            expect(notificationsService.saveNotificationAndSend).toHaveBeenCalledWith(
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
            const loggerSpy = jest.spyOn(processor['logger'], 'warn');
            userRepository.findOne.mockResolvedValue(null);

            const mockTweet = {
                tweet_id: 'tweet-123',
                text: 'Original tweet',
            };

            const job = mockJob({
                repost_to: 'repost-to-id',
                reposted_by: 'reposter-id',
                tweet_id: 'tweet-123',
                tweet: mockTweet as any,
                action: 'add',
            });

            await processor.handleSendRepostNotification(job);

            expect(loggerSpy).toHaveBeenCalledWith(
                expect.stringContaining('Reposter with ID reposter-id not found')
            );
            expect(notificationsService.saveNotificationAndSend).not.toHaveBeenCalled();
        });

        it('should log warning when tweet not provided', async () => {
            const loggerSpy = jest.spyOn(processor['logger'], 'warn');

            const mockReposter = {
                id: 'reposter-id',
                username: 'reposter',
                email: 'reposter@test.com',
                name: 'Reposter',
                avatar_url: 'avatar.jpg',
            };

            userRepository.findOne.mockResolvedValue(mockReposter as User);

            const job = mockJob({
                repost_to: 'repost-to-id',
                reposted_by: 'reposter-id',
                tweet_id: 'tweet-123',
                action: 'add',
            });

            await processor.handleSendRepostNotification(job);

            expect(loggerSpy).toHaveBeenCalledWith(
                expect.stringContaining('Tweet with ID tweet-123 not found')
            );
            expect(notificationsService.saveNotificationAndSend).not.toHaveBeenCalled();
        });
    });

    describe('handleSendRepostNotification - remove action', () => {
        it('should remove repost notification successfully with tweet entity found', async () => {
            const mockTweetEntity = {
                tweet_id: 'tweet-123',
                user_id: 'actual-owner-id',
            };

            tweetRepository.findOne.mockResolvedValue(mockTweetEntity as Tweet);
            notificationsService.removeRepostNotification.mockResolvedValue(true);

            const job = mockJob({
                repost_to: 'repost-to-id',
                reposted_by: 'reposter-id',
                tweet_id: 'tweet-123',
                action: 'remove',
            });

            await processor.handleSendRepostNotification(job);

            expect(tweetRepository.findOne).toHaveBeenCalledWith({
                where: { tweet_id: 'tweet-123' },
                select: ['user_id'],
            });
            expect(notificationsService.removeRepostNotification).toHaveBeenCalledWith(
                'actual-owner-id',
                'tweet-123',
                'reposter-id'
            );
            expect(notificationsService.sendNotificationOnly).toHaveBeenCalledWith(
                NotificationType.REPOST,
                'actual-owner-id',
                expect.objectContaining({
                    reposted_by: 'reposter-id',
                })
            );
        });

        it('should use repost_to when tweet entity not found', async () => {
            const loggerSpy = jest.spyOn(processor['logger'], 'warn');
            tweetRepository.findOne.mockResolvedValue(null);
            notificationsService.removeRepostNotification.mockResolvedValue(true);

            const job = mockJob({
                repost_to: 'repost-to-id',
                reposted_by: 'reposter-id',
                tweet_id: 'tweet-123',
                action: 'remove',
            });

            await processor.handleSendRepostNotification(job);

            expect(loggerSpy).toHaveBeenCalledWith(
                expect.stringContaining('Tweet with ID tweet-123 not found')
            );
            expect(notificationsService.removeRepostNotification).toHaveBeenCalledWith(
                'repost-to-id',
                'tweet-123',
                'reposter-id'
            );
            expect(notificationsService.sendNotificationOnly).toHaveBeenCalledWith(
                NotificationType.REPOST,
                'repost-to-id',
                expect.any(Object)
            );
        });

        it('should not send notification if removal failed', async () => {
            const mockTweetEntity = {
                tweet_id: 'tweet-123',
                user_id: 'actual-owner-id',
            };

            tweetRepository.findOne.mockResolvedValue(mockTweetEntity as Tweet);
            notificationsService.removeRepostNotification.mockResolvedValue(false);

            const job = mockJob({
                repost_to: 'repost-to-id',
                reposted_by: 'reposter-id',
                tweet_id: 'tweet-123',
                action: 'remove',
            });

            await processor.handleSendRepostNotification(job);

            expect(notificationsService.removeRepostNotification).toHaveBeenCalled();
            expect(notificationsService.sendNotificationOnly).not.toHaveBeenCalled();
        });

        it('should handle missing tweet_id during removal', async () => {
            tweetRepository.findOne.mockResolvedValue(null);

            const job = mockJob({
                repost_to: 'repost-to-id',
                reposted_by: 'reposter-id',
                action: 'remove',
            });

            await processor.handleSendRepostNotification(job);

            // findOne is still called even with undefined tweet_id
            expect(tweetRepository.findOne).toHaveBeenCalled();
            // But removeRepostNotification should not be called because tweet_id is falsy
            expect(notificationsService.removeRepostNotification).not.toHaveBeenCalled();
            expect(notificationsService.sendNotificationOnly).not.toHaveBeenCalled();
        });
    });

    describe('error handling', () => {
        it('should log and throw error on database failure', async () => {
            const loggerSpy = jest.spyOn(processor['logger'], 'error');
            const error = new Error('Database connection failed');
            userRepository.findOne.mockRejectedValue(error);

            const mockTweet = {
                tweet_id: 'tweet-123',
                text: 'Original tweet',
            };

            const job = mockJob({
                repost_to: 'repost-to-id',
                reposted_by: 'reposter-id',
                tweet_id: 'tweet-123',
                tweet: mockTweet as any,
                action: 'add',
            });

            await expect(processor.handleSendRepostNotification(job)).rejects.toThrow(error);
            expect(loggerSpy).toHaveBeenCalledWith(
                expect.stringContaining('Error processing repost job'),
                error
            );
        });

        it('should handle error during notification save', async () => {
            const mockReposter = {
                id: 'reposter-id',
                username: 'reposter',
                email: 'reposter@test.com',
                name: 'Reposter',
                avatar_url: 'avatar.jpg',
            };

            const mockTweet = {
                tweet_id: 'tweet-123',
                text: 'Original tweet',
            };

            userRepository.findOne.mockResolvedValue(mockReposter as User);

            const error = new Error('Save failed');
            notificationsService.saveNotificationAndSend.mockRejectedValue(error);

            const job = mockJob({
                repost_to: 'repost-to-id',
                reposted_by: 'reposter-id',
                tweet_id: 'tweet-123',
                tweet: mockTweet as any,
                action: 'add',
            });

            await expect(processor.handleSendRepostNotification(job)).rejects.toThrow(error);
        });

        it('should handle error during notification removal', async () => {
            const mockTweetEntity = {
                tweet_id: 'tweet-123',
                user_id: 'actual-owner-id',
            };

            tweetRepository.findOne.mockResolvedValue(mockTweetEntity as Tweet);

            const error = new Error('Removal failed');
            notificationsService.removeRepostNotification.mockRejectedValue(error);

            const job = mockJob({
                repost_to: 'repost-to-id',
                reposted_by: 'reposter-id',
                tweet_id: 'tweet-123',
                action: 'remove',
            });

            await expect(processor.handleSendRepostNotification(job)).rejects.toThrow(error);
        });
    });
});

import { Test, TestingModule } from '@nestjs/testing';
import { MentionProcessor } from './mention.processor';
import { NotificationsService } from 'src/notifications/notifications.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from 'src/user/entities';
import { Tweet } from 'src/tweets/entities';
import { TweetQuote } from 'src/tweets/entities/tweet-quote.entity';
import { Repository } from 'typeorm';
import { Job } from 'bull';
import { MentionBackGroundNotificationJobDTO } from './mention.dto';
import { NotificationType } from 'src/notifications/enums/notification-types';

describe('MentionProcessor', () => {
    let processor: MentionProcessor;
    let notifications_service: jest.Mocked<NotificationsService>;
    let user_repository: jest.Mocked<Repository<User>>;
    let tweet_repository: jest.Mocked<Repository<Tweet>>;
    let tweet_quote_repository: jest.Mocked<Repository<TweetQuote>>;

    const mock_job = (
        data: Partial<MentionBackGroundNotificationJobDTO>
    ): Job<MentionBackGroundNotificationJobDTO> =>
        ({
            id: 'test-job-id',
            data: data as MentionBackGroundNotificationJobDTO,
        }) as Job<MentionBackGroundNotificationJobDTO>;

    beforeEach(async () => {
        const mock_notifications_service = {
            removeMentionNotification: jest.fn(),
            sendNotificationOnly: jest.fn(),
            saveNotificationAndSend: jest.fn(),
        };

        const mock_user_repository = {
            find: jest.fn(),
            findOne: jest.fn(),
        };

        const mock_tweet_repository = {
            findOne: jest.fn(),
        };

        const mock_tweet_quote_repository = {
            findOne: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MentionProcessor,
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
                {
                    provide: getRepositoryToken(TweetQuote),
                    useValue: mock_tweet_quote_repository,
                },
            ],
        }).compile();

        processor = module.get<MentionProcessor>(MentionProcessor);
        notifications_service = module.get(NotificationsService);
        user_repository = module.get(getRepositoryToken(User));
        tweet_repository = module.get(getRepositoryToken(Tweet));
        tweet_quote_repository = module.get(getRepositoryToken(TweetQuote));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('handleSendMentionNotification - add action', () => {
        it('should process mention for multiple users successfully', async () => {
            const mock_tweet = {
                tweet_id: 'tweet-123',
                text: 'Test tweet @user1 @user2',
                user_id: 'user-author',
            };

            const mock_mentioner = {
                id: 'user-author',
                username: 'author',
                email: 'author@test.com',
                name: 'Author',
                avatar_url: 'avatar.jpg',
            };

            user_repository.findOne.mockResolvedValue(mock_mentioner as User);

            const job = mock_job({
                mentioned_user_ids: ['user-1', 'user-2'],
                mentioned_by: 'user-author',
                tweet_id: 'tweet-123',
                tweet: mock_tweet as unknown as Tweet,
                tweet_type: 'tweet',
                action: 'add',
            });

            await processor.handleSendMentionNotification(job);

            expect(user_repository.findOne).toHaveBeenCalledTimes(2);
            expect(notifications_service.saveNotificationAndSend).toHaveBeenCalledTimes(2);
        });

        it('should skip mentioning the author themselves', async () => {
            const mock_tweet = {
                tweet_id: 'tweet-123',
                text: 'Test tweet @author',
                user_id: 'user-author',
            };

            const job = mock_job({
                mentioned_user_ids: ['user-author'],
                mentioned_by: 'user-author',
                tweet_id: 'tweet-123',
                tweet: mock_tweet as unknown as Tweet,
                tweet_type: 'tweet',
                action: 'add',
            });

            await processor.handleSendMentionNotification(job);

            expect(notifications_service.saveNotificationAndSend).not.toHaveBeenCalled();
        });

        it('should handle quote tweet mentions with parent_tweet', async () => {
            const mock_tweet = {
                tweet_id: 'quote-123',
                text: 'Quoting @user1',
                user_id: 'user-author',
            };

            const mock_parent_tweet = {
                tweet_id: 'parent-123',
                text: 'Original tweet',
            };

            const mock_mentioner = {
                id: 'user-author',
                username: 'author-user',
                email: 'author@example.com',
                name: 'Author User',
                avatar_url: 'http://example.com/avatar.jpg',
            };

            const job = mock_job({
                mentioned_user_ids: ['user-1'],
                mentioned_by: 'user-author',
                tweet: mock_tweet as unknown as Tweet,
                parent_tweet: mock_parent_tweet as any,
                tweet_type: 'quote',
                action: 'add',
            });

            user_repository.findOne.mockResolvedValue(mock_mentioner as any);
            notifications_service.saveNotificationAndSend.mockResolvedValue(undefined);

            await processor.handleSendMentionNotification(job);

            expect(notifications_service.saveNotificationAndSend).toHaveBeenCalledWith(
                'user-1',
                expect.objectContaining({
                    type: NotificationType.MENTION,
                    tweet_id: 'quote-123',
                    parent_tweet_id: 'parent-123',
                    mentioned_by: 'user-author',
                    tweet_type: 'quote',
                }),
                expect.anything()
            );
        });

        it('should handle reply tweet mentions', async () => {
            const mock_tweet = {
                tweet_id: 'reply-123',
                text: 'Reply to @user1',
                user_id: 'user-author',
            };

            const mock_parent_tweet = {
                tweet_id: 'parent-123',
                text: 'Original tweet',
            };

            const mock_mentioner = {
                id: 'user-author',
                username: 'author',
                email: 'author@test.com',
                name: 'Author',
                avatar_url: 'avatar.jpg',
            };

            user_repository.findOne.mockResolvedValue(mock_mentioner as User);

            const job = mock_job({
                mentioned_user_ids: ['user-1'],
                mentioned_by: 'user-author',
                tweet_id: 'reply-123',
                tweet: mock_tweet as unknown as Tweet,
                parent_tweet: mock_parent_tweet as any,
                tweet_type: 'reply',
                action: 'add',
            });

            await processor.handleSendMentionNotification(job);

            expect(notifications_service.saveNotificationAndSend).toHaveBeenCalledWith(
                'user-1',
                expect.objectContaining({
                    type: NotificationType.MENTION,
                    tweet_id: 'reply-123',
                    parent_tweet_id: 'parent-123',
                    mentioned_by: 'user-author',
                    tweet_type: 'reply',
                }),
                expect.any(Object)
            );
        });

        it('should log warning when tweet data not provided', async () => {
            const logger_spy = jest.spyOn(processor['logger'], 'warn');

            const job = mock_job({
                mentioned_user_ids: ['user-1'],
                mentioned_by: 'user-author',
                tweet_id: 'tweet-123',
                tweet_type: 'tweet',
                action: 'add',
            });

            await processor.handleSendMentionNotification(job);

            expect(logger_spy).toHaveBeenCalledWith(
                expect.stringContaining('Tweet data not provided')
            );
            expect(notifications_service.saveNotificationAndSend).not.toHaveBeenCalled();
        });

        it('should log warning when mentioner not found', async () => {
            const mock_tweet = {
                tweet_id: 'tweet-123',
                text: 'Test tweet @user1',
                user_id: 'user-author',
            };

            const logger_spy = jest.spyOn(processor['logger'], 'warn');

            user_repository.findOne.mockResolvedValue(null);

            const job = mock_job({
                mentioned_user_ids: ['user-1'],
                mentioned_by: 'user-author',
                tweet_id: 'tweet-123',
                tweet: mock_tweet as unknown as Tweet,
                tweet_type: 'tweet',
                action: 'add',
            });

            await processor.handleSendMentionNotification(job);

            expect(logger_spy).toHaveBeenCalledWith(expect.stringContaining('Mentioner with ID'));
            expect(notifications_service.saveNotificationAndSend).not.toHaveBeenCalled();
        });
    });

    describe('handleSendMentionNotification - remove action', () => {
        it('should remove mention notifications for multiple users', async () => {
            notifications_service.removeMentionNotification.mockResolvedValue(
                'notification-id-123'
            );

            const job = mock_job({
                mentioned_user_ids: ['user-1', 'user-2'],
                mentioned_by: 'user-author',
                tweet_id: 'tweet-123',
                action: 'remove',
            });

            await processor.handleSendMentionNotification(job);

            expect(notifications_service.removeMentionNotification).toHaveBeenCalledTimes(2);
            expect(notifications_service.removeMentionNotification).toHaveBeenCalledWith(
                'user-1',
                'tweet-123',
                'user-author'
            );
            expect(notifications_service.sendNotificationOnly).toHaveBeenCalledTimes(2);
            expect(notifications_service.sendNotificationOnly).toHaveBeenCalledWith(
                NotificationType.MENTION,
                'user-1',
                {
                    id: 'notification-id-123',
                    ...job.data,
                    action: 'remove',
                }
            );
        });

        it('should skip sending notification if removal failed', async () => {
            notifications_service.removeMentionNotification.mockResolvedValue(null);

            const job = mock_job({
                mentioned_user_ids: ['user-1'],
                mentioned_by: 'user-author',
                tweet_id: 'tweet-123',
                action: 'remove',
            });

            await processor.handleSendMentionNotification(job);

            expect(notifications_service.removeMentionNotification).toHaveBeenCalled();
            expect(notifications_service.sendNotificationOnly).not.toHaveBeenCalled();
        });

        it('should not remove mention for the author themselves', async () => {
            notifications_service.removeMentionNotification.mockResolvedValue(
                'notification-id-123'
            );

            const job = mock_job({
                mentioned_user_ids: ['user-author', 'user-1'],
                mentioned_by: 'user-author',
                tweet_id: 'tweet-123',
                action: 'remove',
            });

            await processor.handleSendMentionNotification(job);

            expect(notifications_service.removeMentionNotification).toHaveBeenCalledTimes(1);
            expect(notifications_service.removeMentionNotification).toHaveBeenCalledWith(
                'user-1',
                'tweet-123',
                'user-author'
            );
        });

        it('should handle empty mentioned_usernames array', async () => {
            const job = mock_job({
                mentioned_user_ids: [],
                mentioned_by: 'user-author',
                tweet_id: 'tweet-123',
                action: 'remove',
            });

            await processor.handleSendMentionNotification(job);

            expect(user_repository.find).not.toHaveBeenCalled();
            expect(notifications_service.removeMentionNotification).not.toHaveBeenCalled();
        });

        it('should handle missing tweet_id', async () => {
            const job = mock_job({
                mentioned_user_ids: ['user-1'],
                mentioned_by: 'user-author',
                action: 'remove',
            });

            await processor.handleSendMentionNotification(job);

            expect(notifications_service.removeMentionNotification).not.toHaveBeenCalled();
        });
    });

    describe('error handling', () => {
        it('should log and throw error on database failure', async () => {
            const mock_tweet = {
                tweet_id: 'tweet-123',
                text: 'Test tweet @user1',
                user_id: 'user-author',
            };

            const logger_spy = jest.spyOn(processor['logger'], 'error');
            const error = new Error('Database connection failed');

            user_repository.findOne.mockRejectedValue(error);

            const job = mock_job({
                mentioned_user_ids: ['user-1'],
                mentioned_by: 'user-author',
                tweet_id: 'tweet-123',
                tweet: mock_tweet as unknown as Tweet,
                tweet_type: 'tweet',
                action: 'add',
            });

            await expect(processor.handleSendMentionNotification(job)).rejects.toThrow(error);
            expect(logger_spy).toHaveBeenCalledWith(
                expect.stringContaining('Error processing mention job'),
                error
            );
        });

        it('should handle error during notification save', async () => {
            const mock_tweet = {
                tweet_id: 'tweet-123',
                text: 'Test tweet @user1',
                user_id: 'user-author',
            };

            const mock_mentioner = {
                id: 'user-author',
                username: 'author',
                email: 'author@test.com',
                name: 'Author',
                avatar_url: 'avatar.jpg',
            };

            user_repository.findOne.mockResolvedValue(mock_mentioner as User);

            const error = new Error('Save failed');
            notifications_service.saveNotificationAndSend.mockRejectedValue(error);

            const job = mock_job({
                mentioned_user_ids: ['user-1'],
                mentioned_by: 'user-author',
                tweet_id: 'tweet-123',
                tweet: mock_tweet as unknown as Tweet,
                tweet_type: 'tweet',
                action: 'add',
            });

            await expect(processor.handleSendMentionNotification(job)).rejects.toThrow(error);
        });
    });
});

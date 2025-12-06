import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MentionProcessor } from './mention.processor';
import { NotificationsService } from 'src/notifications/notifications.service';
import { User } from 'src/user/entities';
import { Tweet, TweetQuote } from 'src/tweets/entities';
import { MentionBackGroundNotificationJobDTO } from './mention.dto';
import type { Job } from 'bull';
import { NotificationType } from 'src/notifications/enums/notification-types';

describe('MentionProcessor', () => {
    let processor: MentionProcessor;
    let mock_notifications_service: any;
    let mock_user_repository: any;
    let mock_tweet_repository: any;
    let mock_tweet_quote_repository: any;

    const mock_user = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        name: 'Test User',
        avatar_url: 'http://example.com/avatar.jpg',
    };

    const mock_mentioner = {
        id: 'user-456',
        username: 'mentioner',
        email: 'mentioner@example.com',
        name: 'Mentioner User',
        avatar_url: 'http://example.com/mentioner.jpg',
    };

    const mock_tweet = {
        tweet_id: 'tweet-123',
        content: 'Test tweet content',
        user_id: 'user-456',
    };

    beforeEach(async () => {
        mock_notifications_service = {
            removeMentionNotification: jest.fn().mockResolvedValue(true),
            sendNotificationOnly: jest.fn().mockResolvedValue(undefined),
            saveNotificationAndSend: jest.fn().mockResolvedValue(undefined),
        };

        mock_user_repository = {
            find: jest.fn().mockResolvedValue([mock_user]),
            findOne: jest.fn().mockResolvedValue(mock_mentioner),
        };

        mock_tweet_repository = {
            findOne: jest.fn().mockResolvedValue(mock_tweet),
        };

        mock_tweet_quote_repository = {
            findOne: jest.fn().mockResolvedValue(null),
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
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(processor).toBeDefined();
    });

    describe('handleSendMentionNotification - Remove Action', () => {
        it('should remove mention notifications successfully', async () => {
            const job_data: MentionBackGroundNotificationJobDTO = {
                mentioned_usernames: ['testuser'],
                mentioned_by: 'user-456',
                tweet_id: 'tweet-123',
                tweet_type: 'tweet',
                action: 'remove',
            };

            const mock_job: Partial<Job<MentionBackGroundNotificationJobDTO>> = {
                id: 'job-123',
                data: job_data,
            };

            await processor.handleSendMentionNotification(
                mock_job as Job<MentionBackGroundNotificationJobDTO>
            );

            expect(mock_user_repository.find).toHaveBeenCalledWith({
                where: [{ username: 'testuser' }],
                select: ['id'],
            });
            expect(mock_notifications_service.removeMentionNotification).toHaveBeenCalledWith(
                'user-123',
                'tweet-123',
                'user-456'
            );
            expect(mock_notifications_service.sendNotificationOnly).toHaveBeenCalledWith(
                NotificationType.MENTION,
                'user-123',
                {
                    tweet_id: 'tweet-123',
                    mentioned_by: 'user-456',
                    action: 'remove',
                }
            );
        });

        it('should skip mentioner when removing notifications', async () => {
            mock_user_repository.find.mockResolvedValue([
                { id: 'user-123' },
                { id: 'user-456' }, // This is the mentioner
            ]);

            const job_data: MentionBackGroundNotificationJobDTO = {
                mentioned_usernames: ['testuser', 'mentioner'],
                mentioned_by: 'user-456',
                tweet_id: 'tweet-123',
                tweet_type: 'tweet',
                action: 'remove',
            };

            const mock_job: Partial<Job<MentionBackGroundNotificationJobDTO>> = {
                id: 'job-456',
                data: job_data,
            };

            await processor.handleSendMentionNotification(
                mock_job as Job<MentionBackGroundNotificationJobDTO>
            );

            // Should only call for user-123, not user-456 (mentioner)
            expect(mock_notifications_service.removeMentionNotification).toHaveBeenCalledTimes(1);
            expect(mock_notifications_service.removeMentionNotification).toHaveBeenCalledWith(
                'user-123',
                'tweet-123',
                'user-456'
            );
        });

        it('should not send notification if removal was unsuccessful', async () => {
            mock_notifications_service.removeMentionNotification.mockResolvedValue(false);

            const job_data: MentionBackGroundNotificationJobDTO = {
                mentioned_usernames: ['testuser'],
                mentioned_by: 'user-456',
                tweet_id: 'tweet-123',
                tweet_type: 'tweet',
                action: 'remove',
            };

            const mock_job: Partial<Job<MentionBackGroundNotificationJobDTO>> = {
                id: 'job-789',
                data: job_data,
            };

            await processor.handleSendMentionNotification(
                mock_job as Job<MentionBackGroundNotificationJobDTO>
            );

            expect(mock_notifications_service.sendNotificationOnly).not.toHaveBeenCalled();
        });

        it('should return early if no mentioned_usernames for remove action', async () => {
            const job_data: MentionBackGroundNotificationJobDTO = {
                mentioned_usernames: [],
                mentioned_by: 'user-456',
                tweet_id: 'tweet-123',
                tweet_type: 'tweet',
                action: 'remove',
            };

            const mock_job: Partial<Job<MentionBackGroundNotificationJobDTO>> = {
                id: 'job-empty',
                data: job_data,
            };

            await processor.handleSendMentionNotification(
                mock_job as Job<MentionBackGroundNotificationJobDTO>
            );

            expect(mock_user_repository.find).not.toHaveBeenCalled();
        });

        it('should return early if no tweet_id for remove action', async () => {
            const job_data: MentionBackGroundNotificationJobDTO = {
                mentioned_usernames: ['testuser'],
                mentioned_by: 'user-456',
                tweet_type: 'tweet',
                action: 'remove',
            };

            const mock_job: Partial<Job<MentionBackGroundNotificationJobDTO>> = {
                id: 'job-no-tweet',
                data: job_data,
            };

            await processor.handleSendMentionNotification(
                mock_job as Job<MentionBackGroundNotificationJobDTO>
            );

            expect(mock_user_repository.find).not.toHaveBeenCalled();
        });
    });

    describe('handleSendMentionNotification - Add Action', () => {
        it('should process mention for normal tweet successfully', async () => {
            const job_data: MentionBackGroundNotificationJobDTO = {
                mentioned_usernames: ['testuser'],
                mentioned_by: 'user-456',
                tweet: mock_tweet as any,
                tweet_type: 'tweet',
                action: 'add',
            };

            const mock_job: Partial<Job<MentionBackGroundNotificationJobDTO>> = {
                id: 'job-add',
                data: job_data,
            };

            await processor.handleSendMentionNotification(
                mock_job as Job<MentionBackGroundNotificationJobDTO>
            );

            expect(mock_user_repository.find).toHaveBeenCalledWith({
                where: [{ username: 'testuser' }],
                select: ['id'],
            });
            expect(mock_user_repository.findOne).toHaveBeenCalledWith({
                where: { id: 'user-456' },
                select: ['username', 'email', 'name', 'avatar_url'],
            });
            expect(mock_notifications_service.saveNotificationAndSend).toHaveBeenCalledWith(
                'user-123',
                expect.objectContaining({
                    type: NotificationType.MENTION,
                    tweet_id: 'tweet-123',
                    mentioned_by: 'user-456',
                    tweet_type: 'tweet',
                }),
                expect.objectContaining({
                    type: NotificationType.MENTION,
                    mentioned_by: expect.objectContaining({
                        id: 'user-456',
                        username: 'mentioner',
                    }),
                    tweet_type: 'tweet',
                })
            );
        });

        it('should process mention for quote tweet with parent_tweet', async () => {
            const parent_tweet = {
                tweet_id: 'parent-123',
                content: 'Parent tweet',
            };

            const job_data: MentionBackGroundNotificationJobDTO = {
                mentioned_usernames: ['testuser'],
                mentioned_by: 'user-456',
                tweet: mock_tweet as any,
                parent_tweet: parent_tweet as any,
                tweet_type: 'quote',
                action: 'add',
            };

            const mock_job: Partial<Job<MentionBackGroundNotificationJobDTO>> = {
                id: 'job-quote',
                data: job_data,
            };

            await processor.handleSendMentionNotification(
                mock_job as Job<MentionBackGroundNotificationJobDTO>
            );

            expect(mock_notifications_service.saveNotificationAndSend).toHaveBeenCalledWith(
                'user-123',
                expect.objectContaining({
                    type: NotificationType.MENTION,
                    tweet_id: 'tweet-123',
                    parent_tweet_id: 'parent-123',
                    tweet_type: 'quote',
                }),
                expect.objectContaining({
                    tweet_type: 'quote',
                })
            );
        });

        it('should process mention for reply tweet', async () => {
            const parent_tweet = {
                tweet_id: 'parent-123',
                content: 'Parent tweet',
            };

            const job_data: MentionBackGroundNotificationJobDTO = {
                mentioned_usernames: ['testuser'],
                mentioned_by: 'user-456',
                tweet: mock_tweet as any,
                parent_tweet: parent_tweet as any,
                tweet_type: 'reply',
                action: 'add',
            };

            const mock_job: Partial<Job<MentionBackGroundNotificationJobDTO>> = {
                id: 'job-reply',
                data: job_data,
            };

            await processor.handleSendMentionNotification(
                mock_job as Job<MentionBackGroundNotificationJobDTO>
            );

            expect(mock_notifications_service.saveNotificationAndSend).toHaveBeenCalledWith(
                'user-123',
                expect.objectContaining({
                    tweet_type: 'reply',
                    parent_tweet_id: 'parent-123',
                }),
                expect.any(Object)
            );
        });

        it('should skip mentioner when adding notifications', async () => {
            mock_user_repository.find.mockResolvedValue([
                { id: 'user-123' },
                { id: 'user-456' }, // This is the mentioner
            ]);

            const job_data: MentionBackGroundNotificationJobDTO = {
                mentioned_usernames: ['testuser', 'mentioner'],
                mentioned_by: 'user-456',
                tweet: mock_tweet as any,
                tweet_type: 'tweet',
                action: 'add',
            };

            const mock_job: Partial<Job<MentionBackGroundNotificationJobDTO>> = {
                id: 'job-skip',
                data: job_data,
            };

            await processor.handleSendMentionNotification(
                mock_job as Job<MentionBackGroundNotificationJobDTO>
            );

            // Should only process for user-123, not user-456 (mentioner)
            expect(mock_notifications_service.saveNotificationAndSend).toHaveBeenCalledTimes(1);
        });

        it('should warn and return if mentioner not found', async () => {
            mock_user_repository.findOne.mockResolvedValue(null);

            const job_data: MentionBackGroundNotificationJobDTO = {
                mentioned_usernames: ['testuser'],
                mentioned_by: 'user-456',
                tweet: mock_tweet as any,
                tweet_type: 'tweet',
                action: 'add',
            };

            const mock_job: Partial<Job<MentionBackGroundNotificationJobDTO>> = {
                id: 'job-no-mentioner',
                data: job_data,
            };

            const logger_spy = jest.spyOn(processor['logger'], 'warn');

            await processor.handleSendMentionNotification(
                mock_job as Job<MentionBackGroundNotificationJobDTO>
            );

            expect(logger_spy).toHaveBeenCalledWith('Mentioner with ID user-456 not found.');
            expect(mock_notifications_service.saveNotificationAndSend).not.toHaveBeenCalled();
        });

        it('should warn and return if tweet data not provided', async () => {
            const job_data: MentionBackGroundNotificationJobDTO = {
                mentioned_usernames: ['testuser'],
                mentioned_by: 'user-456',
                tweet_type: 'tweet',
                action: 'add',
            };

            const mock_job: Partial<Job<MentionBackGroundNotificationJobDTO>> = {
                id: 'job-no-tweet',
                data: job_data,
            };

            const logger_spy = jest.spyOn(processor['logger'], 'warn');

            await processor.handleSendMentionNotification(
                mock_job as Job<MentionBackGroundNotificationJobDTO>
            );

            expect(logger_spy).toHaveBeenCalledWith('Tweet data not provided in job job-no-tweet.');
        });

        it('should handle multiple mentioned users', async () => {
            mock_user_repository.find.mockResolvedValue([
                { id: 'user-123' },
                { id: 'user-789' },
                { id: 'user-999' },
            ]);

            const job_data: MentionBackGroundNotificationJobDTO = {
                mentioned_usernames: ['user1', 'user2', 'user3'],
                mentioned_by: 'user-456',
                tweet: mock_tweet as any,
                tweet_type: 'tweet',
                action: 'add',
            };

            const mock_job: Partial<Job<MentionBackGroundNotificationJobDTO>> = {
                id: 'job-multiple',
                data: job_data,
            };

            await processor.handleSendMentionNotification(
                mock_job as Job<MentionBackGroundNotificationJobDTO>
            );

            expect(mock_notifications_service.saveNotificationAndSend).toHaveBeenCalledTimes(3);
        });
    });

    describe('Error Handling', () => {
        it('should log error and rethrow when processing fails', async () => {
            const error = new Error('Processing error');
            mock_user_repository.find.mockRejectedValue(error);

            const job_data: MentionBackGroundNotificationJobDTO = {
                mentioned_usernames: ['testuser'],
                mentioned_by: 'user-456',
                tweet_id: 'tweet-123',
                tweet_type: 'tweet',
                action: 'remove',
            };

            const mock_job: Partial<Job<MentionBackGroundNotificationJobDTO>> = {
                id: 'job-error',
                data: job_data,
            };

            const logger_spy = jest.spyOn(processor['logger'], 'error');

            await expect(
                processor.handleSendMentionNotification(
                    mock_job as Job<MentionBackGroundNotificationJobDTO>
                )
            ).rejects.toThrow('Processing error');

            expect(logger_spy).toHaveBeenCalledWith(
                'Error processing mention job job-error:',
                error
            );
        });
    });
});

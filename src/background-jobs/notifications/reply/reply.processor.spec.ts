import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bull';
import { ReplyProcessor } from './reply.processor';
import { NotificationsService } from 'src/notifications/notifications.service';
import { User } from 'src/user/entities';
import { Tweet } from 'src/tweets/entities';
import { TweetReply } from 'src/tweets/entities/tweet-reply.entity';
import { ReplyBackGroundNotificationJobDTO } from './reply.dto';
import { NotificationType } from 'src/notifications/enums/notification-types';

describe('ReplyProcessor', () => {
    let processor: ReplyProcessor;
    let notifications_service: jest.Mocked<NotificationsService>;
    let user_repository: jest.Mocked<Repository<User>>;
    let logger_spy: jest.SpyInstance;
    let logger_warn_spy: jest.SpyInstance;

    const mock_user: Partial<User> = {
        id: 'user-456',
        username: 'johndoe',
        email: 'john@example.com',
        name: 'John Doe',
        avatar_url: 'https://example.com/avatar.jpg',
    };

    const mock_tweet = {
        tweet_id: 'reply-tweet-123',
        content: 'This is a reply',
    } as any;

    const mock_original_tweet = {
        tweet_id: 'original-tweet-123',
        content: 'This is the original tweet',
    } as any;

    const mock_job_data: ReplyBackGroundNotificationJobDTO = {
        reply_to: 'user-123',
        replied_by: 'user-456',
        reply_tweet: mock_tweet,
        reply_tweet_id: 'reply-tweet-123',
        original_tweet: mock_original_tweet,
        conversation_id: 'conversation-123',
        action: 'add',
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ReplyProcessor,
                {
                    provide: NotificationsService,
                    useValue: {
                        saveNotificationAndSend: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(User),
                    useValue: {
                        findOne: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(Tweet),
                    useValue: {
                        findOne: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(TweetReply),
                    useValue: {
                        findOne: jest.fn(),
                    },
                },
            ],
        }).compile();

        processor = module.get<ReplyProcessor>(ReplyProcessor);
        notifications_service = module.get(NotificationsService);
        user_repository = module.get(getRepositoryToken(User));

        logger_spy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
        logger_warn_spy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    });

    afterEach(() => {
        jest.clearAllMocks();
        logger_spy.mockRestore();
        logger_warn_spy.mockRestore();
    });

    it('should be defined', () => {
        expect(processor).toBeDefined();
    });

    describe('handleSendReplyNotification - add action', () => {
        it('should process reply notification job successfully', async () => {
            user_repository.findOne.mockResolvedValueOnce(mock_user as User);

            const mock_job: Partial<Job<ReplyBackGroundNotificationJobDTO>> = {
                id: 'job-123',
                data: mock_job_data,
            };

            await processor.handleSendReplyNotification(
                mock_job as Job<ReplyBackGroundNotificationJobDTO>
            );

            expect(user_repository.findOne).toHaveBeenCalledWith({
                where: { id: mock_job_data.replied_by },
                select: ['username', 'email', 'name', 'avatar_url'],
            });

            expect(notifications_service.saveNotificationAndSend).toHaveBeenCalledWith(
                mock_job_data.reply_to,
                expect.objectContaining({
                    type: NotificationType.REPLY,
                    replied_by: mock_job_data.replied_by,
                }),
                expect.objectContaining({
                    type: NotificationType.REPLY,
                    replier: expect.objectContaining({
                        id: mock_job_data.replied_by,
                    }),
                })
            );
        });

        it('should log warning when replier user is not found', async () => {
            user_repository.findOne.mockResolvedValueOnce(null);

            const mock_job: Partial<Job<ReplyBackGroundNotificationJobDTO>> = {
                id: 'job-123',
                data: mock_job_data,
            };

            await processor.handleSendReplyNotification(
                mock_job as Job<ReplyBackGroundNotificationJobDTO>
            );

            expect(logger_warn_spy).toHaveBeenCalledWith(
                `Replier with ID ${mock_job_data.replied_by} not found.`
            );
            expect(notifications_service.saveNotificationAndSend).not.toHaveBeenCalled();
        });

        it('should log warning when reply_tweet is missing', async () => {
            user_repository.findOne.mockResolvedValueOnce(mock_user as User);

            const job_data_without_tweet = {
                ...mock_job_data,
                reply_tweet: undefined,
            };

            const mock_job: Partial<Job<ReplyBackGroundNotificationJobDTO>> = {
                id: 'job-missing-tweet',
                data: job_data_without_tweet,
            };

            await processor.handleSendReplyNotification(
                mock_job as Job<ReplyBackGroundNotificationJobDTO>
            );

            expect(logger_warn_spy).toHaveBeenCalledWith(
                `Reply tweet with ID ${job_data_without_tweet.reply_tweet_id} not found.`
            );
            expect(notifications_service.saveNotificationAndSend).not.toHaveBeenCalled();
        });

        it('should handle errors and log them', async () => {
            const error = new Error('Database error');
            user_repository.findOne.mockRejectedValueOnce(error);

            const mock_job: Partial<Job<ReplyBackGroundNotificationJobDTO>> = {
                id: 'job-123',
                data: mock_job_data,
            };

            await expect(
                processor.handleSendReplyNotification(
                    mock_job as Job<ReplyBackGroundNotificationJobDTO>
                )
            ).rejects.toThrow(error);

            expect(logger_spy).toHaveBeenCalledWith(
                `Error processing reply job ${mock_job.id}:`,
                error
            );
        });

        it('should handle notification gateway errors', async () => {
            user_repository.findOne.mockResolvedValueOnce(mock_user as User);
            const error = new Error('Gateway error');
            notifications_service.saveNotificationAndSend.mockRejectedValueOnce(error);

            const mock_job: Partial<Job<ReplyBackGroundNotificationJobDTO>> = {
                id: 'job-456',
                data: mock_job_data,
            };

            await expect(
                processor.handleSendReplyNotification(
                    mock_job as Job<ReplyBackGroundNotificationJobDTO>
                )
            ).rejects.toThrow(error);

            expect(logger_spy).toHaveBeenCalled();
        });

        it('should handle missing user details gracefully', async () => {
            const incomplete_user: Partial<User> = {
                id: 'user-456',
                username: 'johndoe',
            };
            user_repository.findOne.mockResolvedValueOnce(incomplete_user as User);

            const job_data_with_tweet = {
                ...mock_job_data,
                reply_tweet: mock_tweet,
            };

            const mock_job: Partial<Job<ReplyBackGroundNotificationJobDTO>> = {
                id: 'job-789',
                data: job_data_with_tweet,
            };

            await processor.handleSendReplyNotification(
                mock_job as Job<ReplyBackGroundNotificationJobDTO>
            );

            expect(notifications_service.saveNotificationAndSend).toHaveBeenCalledWith(
                job_data_with_tweet.reply_to,
                expect.objectContaining({
                    type: NotificationType.REPLY,
                }),
                expect.objectContaining({
                    type: NotificationType.REPLY,
                    replier: expect.objectContaining({
                        username: incomplete_user.username,
                    }),
                })
            );
        });
    });

    describe('handleSendReplyNotification - remove action', () => {
        it('should remove reply notification successfully', async () => {
            notifications_service.removeReplyNotification = jest
                .fn()
                .mockResolvedValue('notification-id-123');
            notifications_service.sendNotificationOnly = jest.fn();

            const remove_job_data: ReplyBackGroundNotificationJobDTO = {
                reply_to: 'user-123',
                replied_by: 'user-456',
                reply_tweet_id: 'reply-tweet-123',
                original_tweet_id: 'original-tweet-123',
                conversation_id: 'conversation-123',
                action: 'remove',
            };

            const mock_job: Partial<Job<ReplyBackGroundNotificationJobDTO>> = {
                id: 'job-remove-1',
                data: remove_job_data,
            };

            await processor.handleSendReplyNotification(
                mock_job as Job<ReplyBackGroundNotificationJobDTO>
            );

            expect(notifications_service.removeReplyNotification).toHaveBeenCalledWith(
                'user-123',
                'reply-tweet-123',
                'user-456'
            );
            expect(notifications_service.sendNotificationOnly).toHaveBeenCalledWith(
                NotificationType.REPLY,
                'user-123',
                {
                    id: 'notification-id-123',
                    ...remove_job_data,
                    action: 'remove',
                }
            );
        });

        it('should not send notification if removal failed', async () => {
            notifications_service.removeReplyNotification = jest.fn().mockResolvedValue(null);
            notifications_service.sendNotificationOnly = jest.fn();

            const remove_job_data: ReplyBackGroundNotificationJobDTO = {
                reply_to: 'user-123',
                replied_by: 'user-456',
                reply_tweet_id: 'reply-tweet-123',
                original_tweet_id: 'original-tweet-123',
                conversation_id: 'conversation-123',
                action: 'remove',
            };

            const mock_job: Partial<Job<ReplyBackGroundNotificationJobDTO>> = {
                id: 'job-remove-2',
                data: remove_job_data,
            };

            await processor.handleSendReplyNotification(
                mock_job as Job<ReplyBackGroundNotificationJobDTO>
            );

            expect(notifications_service.removeReplyNotification).toHaveBeenCalled();
            expect(notifications_service.sendNotificationOnly).not.toHaveBeenCalled();
        });

        it('should handle missing reply_to during removal', async () => {
            notifications_service.removeReplyNotification = jest.fn();
            notifications_service.sendNotificationOnly = jest.fn();

            const remove_job_data: ReplyBackGroundNotificationJobDTO = {
                replied_by: 'user-456',
                reply_tweet_id: 'reply-tweet-123',
                original_tweet_id: 'original-tweet-123',
                conversation_id: 'conversation-123',
                action: 'remove',
            } as any;

            const mock_job: Partial<Job<ReplyBackGroundNotificationJobDTO>> = {
                id: 'job-remove-3',
                data: remove_job_data,
            };

            await processor.handleSendReplyNotification(
                mock_job as Job<ReplyBackGroundNotificationJobDTO>
            );

            expect(notifications_service.removeReplyNotification).not.toHaveBeenCalled();
            expect(notifications_service.sendNotificationOnly).not.toHaveBeenCalled();
        });

        it('should handle missing reply_tweet_id during removal', async () => {
            notifications_service.removeReplyNotification = jest.fn();
            notifications_service.sendNotificationOnly = jest.fn();

            const remove_job_data: ReplyBackGroundNotificationJobDTO = {
                reply_to: 'user-123',
                replied_by: 'user-456',
                original_tweet_id: 'original-tweet-123',
                conversation_id: 'conversation-123',
                action: 'remove',
            } as any;

            const mock_job: Partial<Job<ReplyBackGroundNotificationJobDTO>> = {
                id: 'job-remove-4',
                data: remove_job_data,
            };

            await processor.handleSendReplyNotification(
                mock_job as Job<ReplyBackGroundNotificationJobDTO>
            );

            expect(notifications_service.removeReplyNotification).not.toHaveBeenCalled();
            expect(notifications_service.sendNotificationOnly).not.toHaveBeenCalled();
        });
    });
});

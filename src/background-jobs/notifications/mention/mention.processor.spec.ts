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
    let notificationsService: jest.Mocked<NotificationsService>;
    let userRepository: jest.Mocked<Repository<User>>;
    let tweetRepository: jest.Mocked<Repository<Tweet>>;
    let tweetQuoteRepository: jest.Mocked<Repository<TweetQuote>>;

    const mockJob = (
        data: Partial<MentionBackGroundNotificationJobDTO>
    ): Job<MentionBackGroundNotificationJobDTO> =>
        ({
            id: 'test-job-id',
            data: data as MentionBackGroundNotificationJobDTO,
        }) as Job<MentionBackGroundNotificationJobDTO>;

    beforeEach(async () => {
        const mockNotificationsService = {
            removeMentionNotification: jest.fn(),
            sendNotificationOnly: jest.fn(),
            saveNotificationAndSend: jest.fn(),
        };

        const mockUserRepository = {
            find: jest.fn(),
            findOne: jest.fn(),
        };

        const mockTweetRepository = {
            findOne: jest.fn(),
        };

        const mockTweetQuoteRepository = {
            findOne: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MentionProcessor,
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
                {
                    provide: getRepositoryToken(TweetQuote),
                    useValue: mockTweetQuoteRepository,
                },
            ],
        }).compile();

        processor = module.get<MentionProcessor>(MentionProcessor);
        notificationsService = module.get(NotificationsService);
        userRepository = module.get(getRepositoryToken(User));
        tweetRepository = module.get(getRepositoryToken(Tweet));
        tweetQuoteRepository = module.get(getRepositoryToken(TweetQuote));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('handleSendMentionNotification - add action', () => {
        it('should process mention for multiple users successfully', async () => {
            const mockTweet = {
                tweet_id: 'tweet-123',
                text: 'Test tweet @user1 @user2',
                user_id: 'user-author',
            };

            const mockUsers = [
                { id: 'user-1', username: 'user1' },
                { id: 'user-2', username: 'user2' },
            ];

            const mockMentioner = {
                id: 'user-author',
                username: 'author',
                email: 'author@test.com',
                name: 'Author',
                avatar_url: 'avatar.jpg',
            };

            userRepository.find.mockResolvedValue(mockUsers as User[]);
            userRepository.findOne.mockResolvedValue(mockMentioner as User);

            const job = mockJob({
                mentioned_usernames: ['user1', 'user2'],
                mentioned_by: 'user-author',
                tweet_id: 'tweet-123',
                tweet: mockTweet as unknown as Tweet,
                tweet_type: 'tweet',
                action: 'add',
            });

            await processor.handleSendMentionNotification(job);

            expect(userRepository.find).toHaveBeenCalledWith({
                where: [{ username: 'user1' }, { username: 'user2' }],
                select: ['id'],
            });
            expect(userRepository.findOne).toHaveBeenCalledTimes(2);
            expect(notificationsService.saveNotificationAndSend).toHaveBeenCalledTimes(2);
        });

        it('should skip mentioning the author themselves', async () => {
            const mockTweet = {
                tweet_id: 'tweet-123',
                text: 'Test tweet @author',
                user_id: 'user-author',
            };

            const mockUsers = [{ id: 'user-author', username: 'author' }];

            userRepository.find.mockResolvedValue(mockUsers as User[]);

            const job = mockJob({
                mentioned_usernames: ['author'],
                mentioned_by: 'user-author',
                tweet_id: 'tweet-123',
                tweet: mockTweet as unknown as Tweet,
                tweet_type: 'tweet',
                action: 'add',
            });

            await processor.handleSendMentionNotification(job);

            expect(notificationsService.saveNotificationAndSend).not.toHaveBeenCalled();
        });

        it('should handle quote tweet mentions with parent_tweet', async () => {
            const mockTweet = {
                tweet_id: 'quote-123',
                text: 'Quoting @user1',
                user_id: 'user-author',
            };

            const mockParentTweet = {
                tweet_id: 'parent-123',
                text: 'Original tweet',
            };

            const mockUsers = [{ id: 'user-1', username: 'user1' }];

            const mockMentioner = {
                id: 'user-author',
                username: 'author',
                email: 'author@test.com',
                name: 'Author',
                avatar_url: 'avatar.jpg',
            };

            userRepository.find.mockResolvedValue(mockUsers as User[]);
            userRepository.findOne.mockResolvedValue(mockMentioner as User);

            const job = mockJob({
                mentioned_usernames: ['user1'],
                mentioned_by: 'user-author',
                tweet_id: 'quote-123',
                tweet: mockTweet as unknown as Tweet,
                parent_tweet: mockParentTweet as any,
                tweet_type: 'quote',
                action: 'add',
            });

            await processor.handleSendMentionNotification(job);

            expect(notificationsService.saveNotificationAndSend).toHaveBeenCalledWith(
                'user-1',
                expect.objectContaining({
                    type: NotificationType.MENTION,
                    tweet_id: 'quote-123',
                    parent_tweet_id: 'parent-123',
                    mentioned_by: 'user-author',
                    tweet_type: 'quote',
                }),
                expect.objectContaining({
                    type: NotificationType.MENTION,
                    tweet_type: 'quote',
                })
            );
        });

        it('should handle reply tweet mentions', async () => {
            const mockTweet = {
                tweet_id: 'reply-123',
                text: 'Reply to @user1',
                user_id: 'user-author',
            };

            const mockParentTweet = {
                tweet_id: 'parent-123',
                text: 'Original tweet',
            };

            const mockUsers = [{ id: 'user-1', username: 'user1' }];

            const mockMentioner = {
                id: 'user-author',
                username: 'author',
                email: 'author@test.com',
                name: 'Author',
                avatar_url: 'avatar.jpg',
            };

            userRepository.find.mockResolvedValue(mockUsers as User[]);
            userRepository.findOne.mockResolvedValue(mockMentioner as User);

            const job = mockJob({
                mentioned_usernames: ['user1'],
                mentioned_by: 'user-author',
                tweet_id: 'reply-123',
                tweet: mockTweet as unknown as Tweet,
                parent_tweet: mockParentTweet as any,
                tweet_type: 'reply',
                action: 'add',
            });

            await processor.handleSendMentionNotification(job);

            expect(notificationsService.saveNotificationAndSend).toHaveBeenCalledWith(
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
            const loggerSpy = jest.spyOn(processor['logger'], 'warn');

            const job = mockJob({
                mentioned_usernames: ['user1'],
                mentioned_by: 'user-author',
                tweet_id: 'tweet-123',
                tweet_type: 'tweet',
                action: 'add',
            });

            await processor.handleSendMentionNotification(job);

            expect(loggerSpy).toHaveBeenCalledWith(
                expect.stringContaining('Tweet data not provided')
            );
            expect(notificationsService.saveNotificationAndSend).not.toHaveBeenCalled();
        });

        it('should log warning when mentioner not found', async () => {
            const mockTweet = {
                tweet_id: 'tweet-123',
                text: 'Test tweet @user1',
                user_id: 'user-author',
            };

            const mockUsers = [{ id: 'user-1', username: 'user1' }];

            const loggerSpy = jest.spyOn(processor['logger'], 'warn');

            userRepository.find.mockResolvedValue(mockUsers as User[]);
            userRepository.findOne.mockResolvedValue(null);

            const job = mockJob({
                mentioned_usernames: ['user1'],
                mentioned_by: 'user-author',
                tweet_id: 'tweet-123',
                tweet: mockTweet as unknown as Tweet,
                tweet_type: 'tweet',
                action: 'add',
            });

            await processor.handleSendMentionNotification(job);

            expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Mentioner with ID'));
            expect(notificationsService.saveNotificationAndSend).not.toHaveBeenCalled();
        });
    });

    describe('handleSendMentionNotification - remove action', () => {
        it('should remove mention notifications for multiple users', async () => {
            const mockUsers = [
                { id: 'user-1', username: 'user1' },
                { id: 'user-2', username: 'user2' },
            ];

            userRepository.find.mockResolvedValue(mockUsers as User[]);
            notificationsService.removeMentionNotification.mockResolvedValue(true);

            const job = mockJob({
                mentioned_usernames: ['user1', 'user2'],
                mentioned_by: 'user-author',
                tweet_id: 'tweet-123',
                action: 'remove',
            });

            await processor.handleSendMentionNotification(job);

            expect(notificationsService.removeMentionNotification).toHaveBeenCalledTimes(2);
            expect(notificationsService.removeMentionNotification).toHaveBeenCalledWith(
                'user-1',
                'tweet-123',
                'user-author'
            );
            expect(notificationsService.sendNotificationOnly).toHaveBeenCalledTimes(2);
        });

        it('should skip sending notification if removal failed', async () => {
            const mockUsers = [{ id: 'user-1', username: 'user1' }];

            userRepository.find.mockResolvedValue(mockUsers as User[]);
            notificationsService.removeMentionNotification.mockResolvedValue(false);

            const job = mockJob({
                mentioned_usernames: ['user1'],
                mentioned_by: 'user-author',
                tweet_id: 'tweet-123',
                action: 'remove',
            });

            await processor.handleSendMentionNotification(job);

            expect(notificationsService.removeMentionNotification).toHaveBeenCalled();
            expect(notificationsService.sendNotificationOnly).not.toHaveBeenCalled();
        });

        it('should not remove mention for the author themselves', async () => {
            const mockUsers = [
                { id: 'user-author', username: 'author' },
                { id: 'user-1', username: 'user1' },
            ];

            userRepository.find.mockResolvedValue(mockUsers as User[]);
            notificationsService.removeMentionNotification.mockResolvedValue(true);

            const job = mockJob({
                mentioned_usernames: ['author', 'user1'],
                mentioned_by: 'user-author',
                tweet_id: 'tweet-123',
                action: 'remove',
            });

            await processor.handleSendMentionNotification(job);

            expect(notificationsService.removeMentionNotification).toHaveBeenCalledTimes(1);
            expect(notificationsService.removeMentionNotification).toHaveBeenCalledWith(
                'user-1',
                'tweet-123',
                'user-author'
            );
        });

        it('should handle empty mentioned_usernames array', async () => {
            const job = mockJob({
                mentioned_usernames: [],
                mentioned_by: 'user-author',
                tweet_id: 'tweet-123',
                action: 'remove',
            });

            await processor.handleSendMentionNotification(job);

            expect(userRepository.find).not.toHaveBeenCalled();
            expect(notificationsService.removeMentionNotification).not.toHaveBeenCalled();
        });

        it('should handle missing tweet_id', async () => {
            const job = mockJob({
                mentioned_usernames: ['user1'],
                mentioned_by: 'user-author',
                action: 'remove',
            });

            await processor.handleSendMentionNotification(job);

            expect(userRepository.find).not.toHaveBeenCalled();
            expect(notificationsService.removeMentionNotification).not.toHaveBeenCalled();
        });
    });

    describe('error handling', () => {
        it('should log and throw error on database failure', async () => {
            const mockTweet = {
                tweet_id: 'tweet-123',
                text: 'Test tweet @user1',
                user_id: 'user-author',
            };

            const loggerSpy = jest.spyOn(processor['logger'], 'error');
            const error = new Error('Database connection failed');
            userRepository.find.mockRejectedValue(error);

            const job = mockJob({
                mentioned_usernames: ['user1'],
                mentioned_by: 'user-author',
                tweet_id: 'tweet-123',
                tweet: mockTweet as unknown as Tweet,
                tweet_type: 'tweet',
                action: 'add',
            });

            await expect(processor.handleSendMentionNotification(job)).rejects.toThrow(error);
            expect(loggerSpy).toHaveBeenCalledWith(
                expect.stringContaining('Error processing mention job'),
                error
            );
        });

        it('should handle error during notification save', async () => {
            const mockTweet = {
                tweet_id: 'tweet-123',
                text: 'Test tweet @user1',
                user_id: 'user-author',
            };

            const mockUsers = [{ id: 'user-1', username: 'user1' }];

            const mockMentioner = {
                id: 'user-author',
                username: 'author',
                email: 'author@test.com',
                name: 'Author',
                avatar_url: 'avatar.jpg',
            };

            userRepository.find.mockResolvedValue(mockUsers as User[]);
            userRepository.findOne.mockResolvedValue(mockMentioner as User);

            const error = new Error('Save failed');
            notificationsService.saveNotificationAndSend.mockRejectedValue(error);

            const job = mockJob({
                mentioned_usernames: ['user1'],
                mentioned_by: 'user-author',
                tweet_id: 'tweet-123',
                tweet: mockTweet as unknown as Tweet,
                tweet_type: 'tweet',
                action: 'add',
            });

            await expect(processor.handleSendMentionNotification(job)).rejects.toThrow(error);
        });
    });
});

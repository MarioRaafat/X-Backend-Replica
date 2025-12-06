import { Test, TestingModule } from '@nestjs/testing';
import { QuoteProcessor } from './quote.processor';
import { NotificationsService } from 'src/notifications/notifications.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from 'src/user/entities';
import { Tweet } from 'src/tweets/entities';
import { TweetQuote } from 'src/tweets/entities/tweet-quote.entity';
import { Repository } from 'typeorm';
import { Job } from 'bull';
import { QuoteBackGroundNotificationJobDTO } from './quote.dto';
import { NotificationType } from 'src/notifications/enums/notification-types';

describe('QuoteProcessor', () => {
    let processor: QuoteProcessor;
    let notificationsService: jest.Mocked<NotificationsService>;
    let userRepository: jest.Mocked<Repository<User>>;
    let tweetRepository: jest.Mocked<Repository<Tweet>>;
    let tweetQuoteRepository: jest.Mocked<Repository<TweetQuote>>;

    const mockJob = (
        data: Partial<QuoteBackGroundNotificationJobDTO>
    ): Job<QuoteBackGroundNotificationJobDTO> =>
        ({
            id: 'test-job-id',
            data: data as QuoteBackGroundNotificationJobDTO,
        }) as Job<QuoteBackGroundNotificationJobDTO>;

    beforeEach(async () => {
        const mockNotificationsService = {
            removeQuoteNotification: jest.fn(),
            sendNotificationOnly: jest.fn(),
            saveNotificationAndSend: jest.fn(),
        };

        const mockUserRepository = {
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
                QuoteProcessor,
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

        processor = module.get<QuoteProcessor>(QuoteProcessor);
        notificationsService = module.get(NotificationsService);
        userRepository = module.get(getRepositoryToken(User));
        tweetRepository = module.get(getRepositoryToken(Tweet));
        tweetQuoteRepository = module.get(getRepositoryToken(TweetQuote));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('handleSendQuoteNotification - add action', () => {
        it('should process quote notification successfully', async () => {
            const mockQuoter = {
                id: 'quoter-id',
                username: 'quoter',
                email: 'quoter@test.com',
                name: 'Quoter',
                avatar_url: 'avatar.jpg',
            };

            const mockQuoteTweet = {
                tweet_id: 'quote-123',
                text: 'This is a quote',
                user_id: 'quoter-id',
            };

            const mockParentTweet = {
                tweet_id: 'parent-123',
                text: 'Original tweet',
                user_id: 'quote-to-id',
            };

            userRepository.findOne.mockResolvedValue(mockQuoter as User);

            const job = mockJob({
                quote_to: 'quote-to-id',
                quoted_by: 'quoter-id',
                quote_tweet: mockQuoteTweet as any,
                quote_tweet_id: 'quote-123',
                parent_tweet: mockParentTweet as any,
                action: 'add',
            });

            await processor.handleSendQuoteNotification(job);

            expect(userRepository.findOne).toHaveBeenCalledWith({
                where: { id: 'quoter-id' },
                select: ['username', 'email', 'name', 'avatar_url'],
            });
            expect(notificationsService.saveNotificationAndSend).toHaveBeenCalledWith(
                'quote-to-id',
                expect.objectContaining({
                    type: NotificationType.QUOTE,
                    quote_tweet_id: 'quote-123',
                    parent_tweet_id: 'parent-123',
                    quoted_by: 'quoter-id',
                }),
                expect.objectContaining({
                    type: NotificationType.QUOTE,
                })
            );
        });

        it('should log warning when quoter not found', async () => {
            const loggerSpy = jest.spyOn(processor['logger'], 'warn');
            userRepository.findOne.mockResolvedValue(null);

            const mockQuoteTweet = {
                tweet_id: 'quote-123',
                text: 'This is a quote',
            };

            const mockParentTweet = {
                tweet_id: 'parent-123',
                text: 'Original tweet',
            };

            const job = mockJob({
                quote_to: 'quote-to-id',
                quoted_by: 'quoter-id',
                quote_tweet: mockQuoteTweet as any,
                quote_tweet_id: 'quote-123',
                parent_tweet: mockParentTweet as any,
                action: 'add',
            });

            await processor.handleSendQuoteNotification(job);

            expect(loggerSpy).toHaveBeenCalledWith(
                expect.stringContaining('Quoter with ID quoter-id not found')
            );
            expect(notificationsService.saveNotificationAndSend).not.toHaveBeenCalled();
        });

        it('should log warning when parent_tweet not provided', async () => {
            const loggerSpy = jest.spyOn(processor['logger'], 'warn');

            const mockQuoter = {
                id: 'quoter-id',
                username: 'quoter',
                email: 'quoter@test.com',
                name: 'Quoter',
                avatar_url: 'avatar.jpg',
            };

            const mockQuoteTweet = {
                tweet_id: 'quote-123',
                text: 'This is a quote',
            };

            userRepository.findOne.mockResolvedValue(mockQuoter as User);

            const job = mockJob({
                quote_to: 'quote-to-id',
                quoted_by: 'quoter-id',
                quote_tweet: mockQuoteTweet as any,
                quote_tweet_id: 'quote-123',
                action: 'add',
            });

            await processor.handleSendQuoteNotification(job);

            expect(loggerSpy).toHaveBeenCalledWith(
                expect.stringContaining('Parent tweet for quote tweet ID quote-123 not found')
            );
            expect(notificationsService.saveNotificationAndSend).not.toHaveBeenCalled();
        });

        it('should log warning when quote_tweet not provided', async () => {
            const loggerSpy = jest.spyOn(processor['logger'], 'warn');

            const mockQuoter = {
                id: 'quoter-id',
                username: 'quoter',
                email: 'quoter@test.com',
                name: 'Quoter',
                avatar_url: 'avatar.jpg',
            };

            const mockParentTweet = {
                tweet_id: 'parent-123',
                text: 'Original tweet',
            };

            userRepository.findOne.mockResolvedValue(mockQuoter as User);

            const job = mockJob({
                quote_to: 'quote-to-id',
                quoted_by: 'quoter-id',
                quote_tweet_id: 'quote-123',
                parent_tweet: mockParentTweet as any,
                action: 'add',
            });

            await processor.handleSendQuoteNotification(job);

            expect(loggerSpy).toHaveBeenCalledWith(
                expect.stringContaining('Quote tweet with ID quote-123 not found')
            );
            expect(notificationsService.saveNotificationAndSend).not.toHaveBeenCalled();
        });
    });

    describe('handleSendQuoteNotification - remove action', () => {
        it('should remove quote notification successfully', async () => {
            notificationsService.removeQuoteNotification.mockResolvedValue(true);

            const job = mockJob({
                quote_to: 'quote-to-id',
                quoted_by: 'quoter-id',
                quote_tweet_id: 'quote-123',
                action: 'remove',
            });

            await processor.handleSendQuoteNotification(job);

            expect(notificationsService.removeQuoteNotification).toHaveBeenCalledWith(
                'quote-to-id',
                'quote-123',
                'quoter-id'
            );
            expect(notificationsService.sendNotificationOnly).toHaveBeenCalledWith(
                NotificationType.QUOTE,
                'quote-to-id',
                expect.objectContaining({
                    quoted_by: 'quoter-id',
                })
            );
        });

        it('should not send notification if removal failed', async () => {
            notificationsService.removeQuoteNotification.mockResolvedValue(false);

            const job = mockJob({
                quote_to: 'quote-to-id',
                quoted_by: 'quoter-id',
                quote_tweet_id: 'quote-123',
                action: 'remove',
            });

            await processor.handleSendQuoteNotification(job);

            expect(notificationsService.removeQuoteNotification).toHaveBeenCalled();
            expect(notificationsService.sendNotificationOnly).not.toHaveBeenCalled();
        });

        it('should handle missing quote_to during removal', async () => {
            const job = mockJob({
                quoted_by: 'quoter-id',
                quote_tweet_id: 'quote-123',
                action: 'remove',
            });

            await processor.handleSendQuoteNotification(job);

            expect(notificationsService.removeQuoteNotification).not.toHaveBeenCalled();
            expect(notificationsService.sendNotificationOnly).not.toHaveBeenCalled();
        });

        it('should handle missing quote_tweet_id during removal', async () => {
            const job = mockJob({
                quote_to: 'quote-to-id',
                quoted_by: 'quoter-id',
                action: 'remove',
            });

            await processor.handleSendQuoteNotification(job);

            expect(notificationsService.removeQuoteNotification).not.toHaveBeenCalled();
            expect(notificationsService.sendNotificationOnly).not.toHaveBeenCalled();
        });
    });

    describe('error handling', () => {
        it('should log and throw error on database failure', async () => {
            const loggerSpy = jest.spyOn(processor['logger'], 'error');
            const error = new Error('Database connection failed');
            userRepository.findOne.mockRejectedValue(error);

            const mockQuoteTweet = {
                tweet_id: 'quote-123',
                text: 'This is a quote',
            };

            const mockParentTweet = {
                tweet_id: 'parent-123',
                text: 'Original tweet',
            };

            const job = mockJob({
                quote_to: 'quote-to-id',
                quoted_by: 'quoter-id',
                quote_tweet: mockQuoteTweet as any,
                quote_tweet_id: 'quote-123',
                parent_tweet: mockParentTweet as any,
                action: 'add',
            });

            await expect(processor.handleSendQuoteNotification(job)).rejects.toThrow(error);
            expect(loggerSpy).toHaveBeenCalledWith(
                expect.stringContaining('Error processing quote job'),
                error
            );
        });

        it('should handle error during notification save', async () => {
            const mockQuoter = {
                id: 'quoter-id',
                username: 'quoter',
                email: 'quoter@test.com',
                name: 'Quoter',
                avatar_url: 'avatar.jpg',
            };

            const mockQuoteTweet = {
                tweet_id: 'quote-123',
                text: 'This is a quote',
            };

            const mockParentTweet = {
                tweet_id: 'parent-123',
                text: 'Original tweet',
            };

            userRepository.findOne.mockResolvedValue(mockQuoter as User);

            const error = new Error('Save failed');
            notificationsService.saveNotificationAndSend.mockRejectedValue(error);

            const job = mockJob({
                quote_to: 'quote-to-id',
                quoted_by: 'quoter-id',
                quote_tweet: mockQuoteTweet as any,
                quote_tweet_id: 'quote-123',
                parent_tweet: mockParentTweet as any,
                action: 'add',
            });

            await expect(processor.handleSendQuoteNotification(job)).rejects.toThrow(error);
        });

        it('should handle error during notification removal', async () => {
            const error = new Error('Removal failed');
            notificationsService.removeQuoteNotification.mockRejectedValue(error);

            const job = mockJob({
                quote_to: 'quote-to-id',
                quoted_by: 'quoter-id',
                quote_tweet_id: 'quote-123',
                action: 'remove',
            });

            await expect(processor.handleSendQuoteNotification(job)).rejects.toThrow(error);
        });
    });
});

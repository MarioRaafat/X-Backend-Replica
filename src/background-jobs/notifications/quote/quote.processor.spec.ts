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
    let notifications_service: jest.Mocked<NotificationsService>;
    let user_repository: jest.Mocked<Repository<User>>;
    let tweet_repository: jest.Mocked<Repository<Tweet>>;
    let tweet_quote_repository: jest.Mocked<Repository<TweetQuote>>;

    const mock_job = (
        data: Partial<QuoteBackGroundNotificationJobDTO>
    ): Job<QuoteBackGroundNotificationJobDTO> =>
        ({
            id: 'test-job-id',
            data: data as QuoteBackGroundNotificationJobDTO,
        }) as Job<QuoteBackGroundNotificationJobDTO>;

    beforeEach(async () => {
        const mock_notifications_service = {
            removeQuoteNotification: jest.fn(),
            sendNotificationOnly: jest.fn(),
            saveNotificationAndSend: jest.fn(),
        };

        const mock_user_repository = {
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
                QuoteProcessor,
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

        processor = module.get<QuoteProcessor>(QuoteProcessor);
        notifications_service = module.get(NotificationsService);
        user_repository = module.get(getRepositoryToken(User));
        tweet_repository = module.get(getRepositoryToken(Tweet));
        tweet_quote_repository = module.get(getRepositoryToken(TweetQuote));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('handleSendQuoteNotification - add action', () => {
        it('should process quote notification successfully', async () => {
            const mock_quoter = {
                id: 'quoter-id',
                username: 'quoter',
                email: 'quoter@test.com',
                name: 'Quoter',
                avatar_url: 'avatar.jpg',
            };

            const mock_quote_tweet = {
                tweet_id: 'quote-123',
                text: 'This is a quote',
                user_id: 'quoter-id',
            };

            const mock_parent_tweet = {
                tweet_id: 'parent-123',
                text: 'Original tweet',
                user_id: 'quote-to-id',
            };

            user_repository.findOne.mockResolvedValue(mock_quoter as User);

            const job = mock_job({
                quote_to: 'quote-to-id',
                quoted_by: 'quoter-id',
                quote_tweet: mock_quote_tweet as any,
                quote_tweet_id: 'quote-123',
                parent_tweet: mock_parent_tweet as any,
                action: 'add',
            });

            await processor.handleSendQuoteNotification(job);

            expect(user_repository.findOne).toHaveBeenCalledWith({
                where: { id: 'quoter-id' },
                select: ['username', 'email', 'name', 'avatar_url'],
            });
            expect(notifications_service.saveNotificationAndSend).toHaveBeenCalledWith(
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
            const logger_spy = jest.spyOn(processor['logger'], 'warn');
            user_repository.findOne.mockResolvedValue(null);

            const mock_quote_tweet = {
                tweet_id: 'quote-123',
                text: 'This is a quote',
            };

            const mock_parent_tweet = {
                tweet_id: 'parent-123',
                text: 'Original tweet',
            };

            const job = mock_job({
                quote_to: 'quote-to-id',
                quoted_by: 'quoter-id',
                quote_tweet: mock_quote_tweet as any,
                quote_tweet_id: 'quote-123',
                parent_tweet: mock_parent_tweet as any,
                action: 'add',
            });

            await processor.handleSendQuoteNotification(job);

            expect(logger_spy).toHaveBeenCalledWith(
                expect.stringContaining('Quoter with ID quoter-id not found')
            );
            expect(notifications_service.saveNotificationAndSend).not.toHaveBeenCalled();
        });

        it('should log warning when parent_tweet not provided', async () => {
            const logger_spy = jest.spyOn(processor['logger'], 'warn');

            const mock_quoter = {
                id: 'quoter-id',
                username: 'quoter',
                email: 'quoter@test.com',
                name: 'Quoter',
                avatar_url: 'avatar.jpg',
            };

            const mock_quote_tweet = {
                tweet_id: 'quote-123',
                text: 'This is a quote',
            };

            user_repository.findOne.mockResolvedValue(mock_quoter as User);

            const job = mock_job({
                quote_to: 'quote-to-id',
                quoted_by: 'quoter-id',
                quote_tweet: mock_quote_tweet as any,
                quote_tweet_id: 'quote-123',
                action: 'add',
            });

            await processor.handleSendQuoteNotification(job);

            expect(logger_spy).toHaveBeenCalledWith(
                expect.stringContaining('Parent tweet for quote tweet ID quote-123 not found')
            );
            expect(notifications_service.saveNotificationAndSend).not.toHaveBeenCalled();
        });

        it('should log warning when quote_tweet not provided', async () => {
            const logger_spy = jest.spyOn(processor['logger'], 'warn');

            const mock_quoter = {
                id: 'quoter-id',
                username: 'quoter',
                email: 'quoter@test.com',
                name: 'Quoter',
                avatar_url: 'avatar.jpg',
            };

            const mock_parent_tweet = {
                tweet_id: 'parent-123',
                text: 'Original tweet',
            };

            user_repository.findOne.mockResolvedValue(mock_quoter as User);

            const job = mock_job({
                quote_to: 'quote-to-id',
                quoted_by: 'quoter-id',
                quote_tweet_id: 'quote-123',
                parent_tweet: mock_parent_tweet as any,
                action: 'add',
            });

            await processor.handleSendQuoteNotification(job);

            expect(logger_spy).toHaveBeenCalledWith(
                expect.stringContaining('Quote tweet with ID quote-123 not found')
            );
            expect(notifications_service.saveNotificationAndSend).not.toHaveBeenCalled();
        });
    });

    describe('handleSendQuoteNotification - remove action', () => {
        it('should remove quote notification successfully', async () => {
            notifications_service.removeQuoteNotification.mockResolvedValue(true);

            const job = mock_job({
                quote_to: 'quote-to-id',
                quoted_by: 'quoter-id',
                quote_tweet_id: 'quote-123',
                action: 'remove',
            });

            await processor.handleSendQuoteNotification(job);

            expect(notifications_service.removeQuoteNotification).toHaveBeenCalledWith(
                'quote-to-id',
                'quote-123',
                'quoter-id'
            );
            expect(notifications_service.sendNotificationOnly).toHaveBeenCalledWith(
                NotificationType.QUOTE,
                'quote-to-id',
                expect.objectContaining({
                    quoted_by: 'quoter-id',
                })
            );
        });

        it('should not send notification if removal failed', async () => {
            notifications_service.removeQuoteNotification.mockResolvedValue(false);

            const job = mock_job({
                quote_to: 'quote-to-id',
                quoted_by: 'quoter-id',
                quote_tweet_id: 'quote-123',
                action: 'remove',
            });

            await processor.handleSendQuoteNotification(job);

            expect(notifications_service.removeQuoteNotification).toHaveBeenCalled();
            expect(notifications_service.sendNotificationOnly).not.toHaveBeenCalled();
        });

        it('should handle missing quote_to during removal', async () => {
            const job = mock_job({
                quoted_by: 'quoter-id',
                quote_tweet_id: 'quote-123',
                action: 'remove',
            });

            await processor.handleSendQuoteNotification(job);

            expect(notifications_service.removeQuoteNotification).not.toHaveBeenCalled();
            expect(notifications_service.sendNotificationOnly).not.toHaveBeenCalled();
        });

        it('should handle missing quote_tweet_id during removal', async () => {
            const job = mock_job({
                quote_to: 'quote-to-id',
                quoted_by: 'quoter-id',
                action: 'remove',
            });

            await processor.handleSendQuoteNotification(job);

            expect(notifications_service.removeQuoteNotification).not.toHaveBeenCalled();
            expect(notifications_service.sendNotificationOnly).not.toHaveBeenCalled();
        });
    });

    describe('error handling', () => {
        it('should log and throw error on database failure', async () => {
            const logger_spy = jest.spyOn(processor['logger'], 'error');
            const error = new Error('Database connection failed');
            user_repository.findOne.mockRejectedValue(error);

            const mock_quote_tweet = {
                tweet_id: 'quote-123',
                text: 'This is a quote',
            };

            const mock_parent_tweet = {
                tweet_id: 'parent-123',
                text: 'Original tweet',
            };

            const job = mock_job({
                quote_to: 'quote-to-id',
                quoted_by: 'quoter-id',
                quote_tweet: mock_quote_tweet as any,
                quote_tweet_id: 'quote-123',
                parent_tweet: mock_parent_tweet as any,
                action: 'add',
            });

            await expect(processor.handleSendQuoteNotification(job)).rejects.toThrow(error);
            expect(logger_spy).toHaveBeenCalledWith(
                expect.stringContaining('Error processing quote job'),
                error
            );
        });

        it('should handle error during notification save', async () => {
            const mock_quoter = {
                id: 'quoter-id',
                username: 'quoter',
                email: 'quoter@test.com',
                name: 'Quoter',
                avatar_url: 'avatar.jpg',
            };

            const mock_quote_tweet = {
                tweet_id: 'quote-123',
                text: 'This is a quote',
            };

            const mock_parent_tweet = {
                tweet_id: 'parent-123',
                text: 'Original tweet',
            };

            user_repository.findOne.mockResolvedValue(mock_quoter as User);

            const error = new Error('Save failed');
            notifications_service.saveNotificationAndSend.mockRejectedValue(error);

            const job = mock_job({
                quote_to: 'quote-to-id',
                quoted_by: 'quoter-id',
                quote_tweet: mock_quote_tweet as any,
                quote_tweet_id: 'quote-123',
                parent_tweet: mock_parent_tweet as any,
                action: 'add',
            });

            await expect(processor.handleSendQuoteNotification(job)).rejects.toThrow(error);
        });

        it('should handle error during notification removal', async () => {
            const error = new Error('Removal failed');
            notifications_service.removeQuoteNotification.mockRejectedValue(error);

            const job = mock_job({
                quote_to: 'quote-to-id',
                quoted_by: 'quoter-id',
                quote_tweet_id: 'quote-123',
                action: 'remove',
            });

            await expect(processor.handleSendQuoteNotification(job)).rejects.toThrow(error);
        });
    });
});

import { Process, Processor } from '@nestjs/bull';
import { JOB_NAMES, QUEUE_NAMES } from 'src/background-jobs/constants/queue.constants';
import type { Job } from 'bull';
import { NotificationsService } from 'src/notifications/notifications.service';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/entities';
import { Repository } from 'typeorm';
import { NotificationType } from 'src/notifications/enums/notification-types';
import { Tweet } from 'src/tweets/entities';
import { TweetQuote } from 'src/tweets/entities/tweet-quote.entity';
import { QuoteBackGroundNotificationJobDTO } from './quote.dto';
import { plainToInstance } from 'class-transformer';
import { TweetQuoteResponseDTO } from 'src/tweets/dto/tweet-quote-reponse';
import { TweetResponseDTO } from 'src/tweets/dto';
import { QuoteNotificationEntity } from 'src/notifications/entities/quote-notification.entity';

@Processor(QUEUE_NAMES.NOTIFICATION)
export class QuoteProcessor {
    private readonly logger = new Logger(QuoteProcessor.name);

    constructor(
        private readonly notifications_service: NotificationsService,
        @InjectRepository(User) private readonly user_repository: Repository<User>,
        @InjectRepository(Tweet) private readonly tweet_repository: Repository<Tweet>,
        @InjectRepository(TweetQuote)
        private readonly tweet_quote_repository: Repository<TweetQuote>
    ) {}

    @Process(JOB_NAMES.NOTIFICATION.QUOTE)
    async handleSendQuoteNotification(job: Job<QuoteBackGroundNotificationJobDTO>) {
        try {
            const { quote_to, quoted_by, quote_tweet, quote_tweet_id, parent_tweet, action } =
                job.data;

            if (action === 'remove') {
                let notification_id: string | null = null;
                if (quote_to && quote_tweet_id) {
                    notification_id = await this.notifications_service.removeQuoteNotification(
                        quote_to,
                        quote_tweet_id,
                        quoted_by
                    );
                }

                if (notification_id) {
                    this.notifications_service.sendNotificationOnly(
                        NotificationType.QUOTE,
                        quote_to,
                        {
                            id: notification_id,
                            ...job.data,
                            action: 'remove',
                        }
                    );
                }
            } else {
                const quoter = await this.user_repository.findOne({
                    where: { id: quoted_by },
                    select: ['username', 'email', 'name', 'avatar_url'],
                });

                if (!quoter) {
                    this.logger.warn(`Quoter with ID ${quoted_by} not found.`);
                    return;
                }

                quoter.id = quoted_by;

                const quote = plainToInstance(
                    TweetQuoteResponseDTO,
                    {
                        ...quote_tweet,
                        parent_tweet: parent_tweet,
                    },
                    { excludeExtraneousValues: true }
                );

                if (!parent_tweet) {
                    this.logger.warn(
                        `Parent tweet for quote tweet ID ${quote_tweet_id} not found.`
                    );
                    return;
                }

                if (!quote_tweet) {
                    this.logger.warn(`Quote tweet with ID ${quote_tweet_id} not found.`);
                    return;
                }

                const notification_entity: QuoteNotificationEntity = Object.assign(
                    new QuoteNotificationEntity(),
                    {
                        type: NotificationType.QUOTE,
                        quote_tweet_id: quote_tweet.tweet_id,
                        parent_tweet_id: parent_tweet.tweet_id,
                        quoted_by,
                        created_at: new Date(),
                    }
                );

                await this.notifications_service.saveNotificationAndSend(
                    quote_to,
                    notification_entity,
                    {
                        type: NotificationType.QUOTE,
                        quoted_by: quoter,
                        quote,
                    }
                );
            }
        } catch (error) {
            this.logger.error(`Error processing quote job ${job.id}:`, error);
            throw error;
        }
    }
}

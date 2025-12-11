import { Process, Processor } from '@nestjs/bull';
import { JOB_NAMES, QUEUE_NAMES } from 'src/background-jobs/constants/queue.constants';
import type { Job } from 'bull';
import { NotificationsService } from 'src/notifications/notifications.service';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/entities';
import { Repository } from 'typeorm';
import { NotificationType } from 'src/notifications/enums/notification-types';
import { MentionBackGroundNotificationJobDTO } from './mention.dto';
import { Tweet } from 'src/tweets/entities';
import { TweetQuote } from 'src/tweets/entities/tweet-quote.entity';
import { MentionNotificationEntity } from 'src/notifications/entities/mention-notification.entity';
import { plainToInstance } from 'class-transformer';
import { TweetQuoteResponseDTO } from 'src/tweets/dto/tweet-quote-reponse';
import { TweetResponseDTO } from 'src/tweets/dto';

@Processor(QUEUE_NAMES.NOTIFICATION)
export class MentionProcessor {
    private readonly logger = new Logger(MentionProcessor.name);

    constructor(
        private readonly notifications_service: NotificationsService,
        @InjectRepository(User) private readonly user_repository: Repository<User>,
        @InjectRepository(Tweet) private readonly tweet_repository: Repository<Tweet>,
        @InjectRepository(TweetQuote)
        private readonly tweet_quote_repository: Repository<TweetQuote>
    ) {}

    @Process(JOB_NAMES.NOTIFICATION.MENTION)
    async handleSendMentionNotification(job: Job<MentionBackGroundNotificationJobDTO>) {
        try {
            const {
                mentioned_user_ids,
                mentioned_by,
                tweet_id,
                tweet,
                parent_tweet,
                tweet_type,
                action,
            } = job.data;

            if (action === 'remove') {
                // For remove action, we need usernames to find user IDs
                if (!mentioned_user_ids || mentioned_user_ids.length === 0 || !tweet_id) return;

                // Queue removal for each mentioned user
                for (const user_id of mentioned_user_ids) {
                    if (user_id === mentioned_by) continue;

                    const was_deleted = await this.notifications_service.removeMentionNotification(
                        user_id,
                        tweet_id,
                        mentioned_by
                    );

                    if (was_deleted) {
                        this.notifications_service.sendNotificationOnly(
                            NotificationType.MENTION,
                            user_id,
                            {
                                type: NotificationType.MENTION,
                                tweet_id,
                                mentioned_by,
                                action,
                            }
                        );
                    }
                }
            } else {
                if (!tweet) {
                    this.logger.warn(`Tweet data not provided in job ${job.id}.`);
                    return;
                }

                // For add action with usernames (batch processing)
                else if (mentioned_user_ids && mentioned_user_ids.length > 0) {
                    // Process mention for each user
                    for (const user_id of mentioned_user_ids) {
                        if (user_id === mentioned_by) continue;

                        await this.processMentionForUser(
                            user_id,
                            mentioned_by,
                            tweet,
                            parent_tweet,
                            tweet_type
                        );
                    }
                }
            }
        } catch (error) {
            this.logger.error(`Error processing mention job ${job.id}:`, error);
            throw error;
        }
    }

    private async processMentionForUser(
        mentioned_user_id: string,
        mentioned_by: string,
        tweet: Tweet,
        parent_tweet: TweetResponseDTO | undefined,
        tweet_type: 'tweet' | 'quote' | 'reply'
    ): Promise<void> {
        const mentioner = await this.user_repository.findOne({
            where: { id: mentioned_by },
            select: ['username', 'email', 'name', 'avatar_url'],
        });

        if (!mentioner) {
            this.logger.warn(`Mentioner with ID ${mentioned_by} not found.`);
            return;
        }

        mentioner.id = mentioned_by;

        // Build payload
        const payload: any = {
            type: NotificationType.MENTION,
            mentioned_by: mentioner,
            tweet_type,
        };

        if (tweet_type === 'quote' && parent_tweet) {
            // Use parent_tweet from DTO (already formatted)
            const quote = plainToInstance(
                TweetQuoteResponseDTO,
                {
                    ...tweet,
                    parent_tweet,
                },
                { excludeExtraneousValues: true }
            );
            payload.tweet = quote;
        } else {
            // For normal tweets or replies
            payload.tweet = plainToInstance(TweetResponseDTO, tweet, {
                excludeExtraneousValues: true,
            });
        }

        const notification_entity: MentionNotificationEntity = Object.assign(
            new MentionNotificationEntity(),
            {
                type: NotificationType.MENTION,
                tweet_id: tweet.tweet_id,
                parent_tweet_id: parent_tweet?.tweet_id || null,
                mentioned_by,
                tweet_type,
                created_at: new Date(),
            }
        );

        await this.notifications_service.saveNotificationAndSend(
            mentioned_user_id,
            notification_entity,
            payload
        );
    }
}

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
        private readonly notificationsService: NotificationsService,
        @InjectRepository(User) private readonly user_repository: Repository<User>,
        @InjectRepository(Tweet) private readonly tweet_repository: Repository<Tweet>,
        @InjectRepository(TweetQuote)
        private readonly tweet_quote_repository: Repository<TweetQuote>
    ) {}

    @Process(JOB_NAMES.NOTIFICATION.MENTION)
    async handleSendMentionNotification(job: Job<MentionBackGroundNotificationJobDTO>) {
        try {
            const {
                mentioned_usernames,
                mentioned_by,
                tweet_id,
                tweet,
                parent_tweet,
                tweet_type,
                action,
            } = job.data;

            if (action === 'remove') {
                // For remove action, we need usernames to find user IDs
                if (!mentioned_usernames || mentioned_usernames.length === 0 || !tweet_id) return;

                // Fetch user IDs from usernames
                const users = await this.user_repository.find({
                    where: mentioned_usernames.map((username) => ({ username })),
                    select: ['id'],
                });

                // Queue removal for each mentioned user
                for (const user of users) {
                    if (user.id === mentioned_by) continue;

                    const was_deleted = await this.notificationsService.removeMentionNotification(
                        user.id,
                        tweet_id,
                        mentioned_by
                    );

                    if (was_deleted) {
                        this.notificationsService.sendNotificationOnly(
                            NotificationType.MENTION,
                            user.id,
                            {
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

                // For add action with specific user ID (used when we already know the user)
                // if (mentioned_user_id) {
                //     await this.processMentionForUser(
                //         mentioned_user_id,
                //         mentioned_by,
                //         tweet,
                //         parent_tweet,
                //         tweet_type
                //     );
                // }
                // For add action with usernames (batch processing)
                else if (mentioned_usernames && mentioned_usernames.length > 0) {
                    // Fetch user IDs from usernames
                    const users = await this.user_repository.find({
                        where: mentioned_usernames.map((username) => ({ username })),
                        select: ['id'],
                    });

                    // Process mention for each user
                    for (const user of users) {
                        if (user.id === mentioned_by) continue;

                        await this.processMentionForUser(
                            user.id,
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

        await this.notificationsService.saveNotificationAndSend(
            mentioned_user_id,
            notification_entity,
            payload
        );
    }
}

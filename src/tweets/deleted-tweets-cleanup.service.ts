import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Column, CreateDateColumn, Entity, In, LessThan, PrimaryColumn, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EsDeleteTweetJobService } from 'src/background-jobs/elasticsearch/es-delete-tweet.service';
import { Hashtag } from './entities/hashtags.entity';

// Entity for the deleted_tweets_log table
@Entity('deleted_tweets_log')
export class DeletedTweetsLog {
    @PrimaryColumn({ type: 'uuid' })
    tweet_id: string;

    @Column({ type: 'text', nullable: true })
    content: string;

    @CreateDateColumn({ type: 'timestamptz' })
    deleted_at: Date;
}

@Injectable()
export class DeletedTweetsCleanupService {
    private readonly logger = new Logger(DeletedTweetsCleanupService.name);

    constructor(
        @InjectRepository(DeletedTweetsLog)
        private readonly deleted_tweets_repository: Repository<DeletedTweetsLog>,
        @InjectRepository(Hashtag)
        private readonly hashtag_repository: Repository<Hashtag>,
        private readonly es_delete_tweet_service: EsDeleteTweetJobService
    ) {}

    @Cron(CronExpression.EVERY_MINUTE)
    async processDeletedTweets(): Promise<void> {
        try {
            const batch_size = 100;

            const deleted_tweets = await this.deleted_tweets_repository.find({
                take: batch_size,
                order: { deleted_at: 'ASC' },
            });

            if (deleted_tweets.length === 0) {
                return;
            }

            this.logger.log(
                `Processing ${deleted_tweets.length} deleted tweets for ES cleanup and hashtag decrement`
            );

            for (const deleted_tweet of deleted_tweets) {
                // Extract and decrement hashtags
                // if (deleted_tweet.content) {
                //     const hashtag_matches =
                //         deleted_tweet.content.match(/#([\p{L}\p{N}_]+)/gu) || [];
                //     if (hashtag_matches.length > 0) {
                //         const hashtags = hashtag_matches.map((h) => h.slice(1).toLowerCase());
                //         const unique_hashtags = [...new Set(hashtags)];

                //         if (unique_hashtags.length > 0) {
                //             await this.hashtag_repository.decrement(
                //                 { name: In(unique_hashtags) },
                //                 'usage_count',
                //                 1
                //             );
                //         }
                //     }
                // }

                // Queue Elasticsearch deletion
                await this.es_delete_tweet_service.queueDeleteTweet({
                    tweet_id: deleted_tweet.tweet_id,
                });
            }

            const tweet_ids = deleted_tweets.map((t) => t.tweet_id);
            await this.deleted_tweets_repository.delete(tweet_ids);

            this.logger.log(`Successfully processed ${deleted_tweets.length} deleted tweets`);
        } catch (error) {
            this.logger.error('Error processing deleted tweets for ES cleanup', error);
        }
    }

    @Cron(CronExpression.EVERY_DAY_AT_2AM)
    async cleanupOldEntries(): Promise<void> {
        try {
            const seven_days_ago = new Date();
            seven_days_ago.setDate(seven_days_ago.getDate() - 7);

            const result = await this.deleted_tweets_repository.delete({
                deleted_at: LessThan(seven_days_ago),
            });

            if (result.affected && result.affected > 0) {
                this.logger.warn(
                    `Cleaned up ${result.affected} old deleted tweet log entries that were not processed`
                );
            }
        } catch (error) {
            this.logger.error('Error cleaning up old deleted tweets log entries', error);
        }
    }
}

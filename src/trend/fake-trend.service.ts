import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TweetsService } from 'src/tweets/tweets.service';
import { User } from 'src/user/entities/user.entity';
import { TrendDataConstants } from 'src/constants/variables';
import * as bcrypt from 'bcrypt';
import { Hashtag } from 'src/tweets/entities/hashtags.entity';
import { TweetHashtag } from 'src/tweets/entities/tweet-hashtag.entity';
import { TrendService } from './trend.service';
import { HashtagJobDto } from 'src/background-jobs/hashtag/hashtag-job.dto';

interface IFakeTrendHashtags {
    hashtags: string[];
    category: 'Sports' | 'Entertainment' | 'News';
}

@Injectable()
export class FakeTrendService {
    private readonly logger = new Logger(FakeTrendService.name);
    private readonly HASHTAGS_PER_CATEGORY = 33; // ~100 hashtags total from 3 categories
    private readonly TWEETS_TO_CREATE = 10; // Number of fake trend tweets to create

    constructor(
        private readonly tweets_service: TweetsService,
        private readonly trend_service: TrendService,

        @InjectRepository(User)
        private readonly user_repository: Repository<User>,
        @InjectRepository(Hashtag)
        private readonly hashtag_repository: Repository<Hashtag>,
        private readonly data_source: DataSource,
        @InjectRepository(TweetHashtag)
        private readonly tweet_hashtags_repository: Repository<TweetHashtag>
    ) {}

    // Every 20 minutes
    // @Cron('*/20 * * * *', {
    //     name: 'fake-trends-job',
    //     timeZone: 'UTC',
    // })
    async fakeTrends(): Promise<void> {
        try {
            const trend_bot = await this.insertTrendBotIfNotExists();
            await this.createFakeTrendTweets(trend_bot.id);
        } catch (error) {
            this.logger.error('Error in fakeTrends cron job:', error);
        }
    }

    async deleteFakeTrends(): Promise<void> {
        try {
            const trend_bot = await this.user_repository.findOne({
                where: { email: TrendDataConstants.TREND_BOT.email },
            });

            if (!trend_bot) {
                this.logger.log('No Trend Bot found to delete tweets for.');
                return;
            }

            await this.tweets_service.deleteTweetsByUserId(trend_bot.id);
            this.logger.log(`Deleted fake trend tweets created by Trend Bot.`);
        } catch (error) {
            this.logger.error('Error deleting fake trend tweets:', error);
        }
    }

    private async insertTrendBotIfNotExists(): Promise<User> {
        const trend_bot_data = TrendDataConstants.TREND_BOT;

        // Check if trend bot already exists
        let trend_bot = await this.user_repository.findOne({
            where: { email: trend_bot_data.email },
        });

        if (trend_bot) {
            this.logger.log('Trend Bot already exists');
            return trend_bot;
        }

        // Create trend bot if it doesn't exist
        const hashed_password = await bcrypt.hash(trend_bot_data.password, 10);
        const new_trend_bot = this.user_repository.create({
            ...trend_bot_data,
            password: hashed_password,
        });

        trend_bot = await this.user_repository.save(new_trend_bot);
        this.logger.log('Trend Bot created successfully');

        return trend_bot;
    }

    private async createFakeTrendTweets(trend_bot_id: string): Promise<void> {
        try {
            // Select random hashtags from each category
            const selected_hashtags = this.selectRandomHashtags();

            // Create tweets with selected hashtags
            for (let i = 0; i < this.TWEETS_TO_CREATE; i++) {
                const hashtag_selection = this.getRandomHashtagSelection(selected_hashtags);
                const content = this.buildTweetContent(hashtag_selection.hashtags);

                // Build hashtag topics for the selected category
                const hashtag_topics = this.tweets_service.buildDefaultHashtagTopics(
                    hashtag_selection.hashtags,
                    hashtag_selection.category
                );

                try {
                    await this.tweets_service.createFakeTrendTweet(
                        content,
                        trend_bot_id,
                        hashtag_topics
                    );

                    this.logger.log(
                        `Created fake trend tweet #${i + 1} with ${hashtag_selection.category} category`
                    );
                } catch (error) {
                    this.logger.warn(
                        `Failed to create fake trend tweet #${i + 1}:`,
                        (error as Error).message
                    );
                }
            }
        } catch (error) {
            this.logger.error('Error creating fake trend tweets:', error);
        }
    }

    private selectRandomHashtags(): IFakeTrendHashtags {
        const sports_trends = TrendDataConstants.SPORTS_TRENDS;
        const entertainment_trends = TrendDataConstants.ENTERTAINMENT_TRENDS;
        const news_trends = TrendDataConstants.NEWS_TRENDS;

        const selected: IFakeTrendHashtags = {
            hashtags: [],
            category: 'Sports',
        };

        // Select random hashtags from each category
        selected.hashtags.push(
            ...this.getRandomItems(sports_trends, this.HASHTAGS_PER_CATEGORY),
            ...this.getRandomItems(entertainment_trends, this.HASHTAGS_PER_CATEGORY),
            ...this.getRandomItems(news_trends, this.HASHTAGS_PER_CATEGORY)
        );

        return selected;
    }

    private getRandomHashtagSelection(all_hashtags: IFakeTrendHashtags): {
        hashtags: string[];
        category: 'Sports' | 'Entertainment' | 'News';
    } {
        const categories: Array<'Sports' | 'Entertainment' | 'News'> = [
            'Sports',
            'Entertainment',
            'News',
        ];
        const random_category = categories[Math.floor(Math.random() * categories.length)];

        // Select random hashtags based on category
        const category_hashtags = this.getHashtagsByCategory(random_category);
        const selected_hashtags = this.getRandomItems(category_hashtags, 5); // 5 hashtags per tweet

        return {
            hashtags: selected_hashtags,
            category: random_category,
        };
    }

    private getHashtagsByCategory(category: 'Sports' | 'Entertainment' | 'News'): string[] {
        switch (category) {
            case 'Sports':
                return TrendDataConstants.SPORTS_TRENDS;
            case 'Entertainment':
                return TrendDataConstants.ENTERTAINMENT_TRENDS;
            case 'News':
                return TrendDataConstants.NEWS_TRENDS;
            default:
                return TrendDataConstants.SPORTS_TRENDS;
        }
    }

    private getRandomItems<T>(array: T[], count: number): T[] {
        const shuffled = [...array].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(count, array.length));
    }

    private buildTweetContent(hashtags: string[]): string {
        const templates = [
            `Check out these trending topics! ${hashtags.join(' ')}`,
            `Don't miss out on what's trending right now ${hashtags.join(' ')}`,
            `The hottest trends today ${hashtags.join(' ')}`,
            `Join the conversation ${hashtags.join(' ')}`,
            `Stay updated with these trends ${hashtags.join(' ')}`,
            `Latest trending: ${hashtags.join(' ')}`,
            `What's hot in the feed ${hashtags.join(' ')}`,
            `Catch the latest buzz ${hashtags.join(' ')}`,
        ];

        const random_template = templates[Math.floor(Math.random() * templates.length)];
        return random_template;
    }

    async seedTrend(): Promise<void> {
        // UPDATE TWEET TIMESTAMP TO LAST 6 HOURS
        await this.data_source.query(`
        UPDATE tweets
        SET created_at = NOW() - (
            CASE 
                WHEN random() < 0.05 THEN random() * interval '6 hours'                         -- 00:00–06:00 (5%)
                WHEN random() < 0.20 THEN interval '6 hours' + random() * interval '3 hours'   -- 06:00–09:00 (15%)
                WHEN random() < 0.60 THEN interval '9 hours' + random() * interval '8 hours'   -- 09:00–17:00 (40%)
                WHEN random() < 0.90 THEN interval '17 hours' + random() * interval '5 hours'  -- 17:00–22:00 (30%)
                ELSE interval '22 hours' + random() * interval '2 hours'                        -- 22:00–00:00 (10%)
            END
        )
    `);

        // SELECT TOP 50 HASHTAGS FROM EACH CATEGORY
        const sports_hashtags = await this.hashtag_repository.find({
            where: { category: 'Sports' },
            order: { usage_count: 'DESC' },
            take: 50,
        });

        const entertainment_hashtags = await this.hashtag_repository.find({
            where: { category: 'Entertainment' },
            order: { usage_count: 'DESC' },
            take: 50,
        });

        const news_hashtags = await this.hashtag_repository.find({
            where: { category: 'News' },
            order: { usage_count: 'DESC' },
            take: 50,
        });

        // Combine all hashtags
        const all_hashtags = [
            ...sports_hashtags.map((h) => ({ ...h, category: 'Sports' })),
            ...entertainment_hashtags.map((h) => ({ ...h, category: 'Entertainment' })),
            ...news_hashtags.map((h) => ({ ...h, category: 'News' })),
        ];

        // Get tweet data for these hashtags with their timestamps
        const hashtag_names = all_hashtags.map((h) => h.name);

        const tweet_hashtag_data = await this.data_source.query(
            `
        SELECT 
            th.hashtag_name,
            th.tweet_created_at,
            h.category
        FROM tweet_hashtags th
        JOIN hashtag h ON th.hashtag_name = h.name
        WHERE th.hashtag_name = ANY($1)
        ORDER BY th.tweet_created_at DESC
    `,
            [hashtag_names]
        );

        // Group by tweet timestamp and build HashtagJobDto for each unique timestamp
        const timestamp_map = new Map<number, Map<string, Record<string, number>>>();

        for (const row of tweet_hashtag_data) {
            const timestamp = new Date(row.tweet_created_at).getTime();
            const hashtag_name = row.hashtag_name;
            const category = row.category;

            if (!timestamp_map.has(timestamp)) {
                timestamp_map.set(timestamp, new Map());
            }

            const hashtag_map = timestamp_map.get(timestamp);

            if (hashtag_map) {
                if (!hashtag_map.has(hashtag_name)) {
                    hashtag_map.set(hashtag_name, {});
                }

                const categories = hashtag_map.get(hashtag_name);
                if (categories) {
                    // Set category percentage (you can adjust this logic based on your needs)
                    // For now, setting 100% for the primary category
                    categories[category] = 100;
                }
            }
        }

        // Process each timestamp group
        for (const [timestamp, hashtag_map] of timestamp_map.entries()) {
            const hashtags: Record<string, Record<string, number>> = {};

            for (const [hashtag_name, categories] of hashtag_map.entries()) {
                hashtags[hashtag_name] = categories;
            }

            const job_data: HashtagJobDto = {
                hashtags,
                timestamp,
            };

            // Call the three functions with properly formatted data
            await this.trend_service.insertCandidateHashtags(job_data);
            await this.trend_service.updateHashtagCounts(job_data);
            await this.trend_service.insertCandidateCategories(job_data);
        }

        console.log(`Seeded trends for ${timestamp_map.size} unique timestamps`);
    }
}

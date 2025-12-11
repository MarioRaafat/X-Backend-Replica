import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TweetsService } from 'src/tweets/tweets.service';
import { User } from 'src/user/entities/user.entity';
import { TrendDataConstants } from 'src/constants/variables';
import * as bcrypt from 'bcrypt';

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
        @InjectRepository(User)
        private readonly user_repository: Repository<User>
    ) {}

    // Every 20 minutes
    @Cron('*/20 * * * *', {
        name: 'fake-trends-job',
        timeZone: 'UTC',
    })
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
}

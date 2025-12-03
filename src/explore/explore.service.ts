import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '../redis/redis.service';
import { Category } from '../category/entities/category.entity';
import { TweetsService } from '../tweets/tweets.service';

@Injectable()
export class ExploreService {
    constructor(
        private readonly redis_service: RedisService,
        @InjectRepository(Category)
        private readonly category_repository: Repository<Category>,
        private readonly tweets_service: TweetsService
    ) {}

    async getExploreData(current_user_id?: string) {
        // This method would fetch all explore data in one go
        // Combining trending, who to follow, and for-you posts
        return {
            trending: await this.getTrending(),
            who_to_follow: await this.getWhoToFollow(),
            for_you_posts: await this.getForYouPosts(current_user_id),
        };
    }

    async getTrending(category: string = '', country: string = 'global'): Promise<string[]> {
       return [];
    }

    async getTrendingWithScores(
        category_id: string = 'global',
        limit: number = 50
    ): Promise<Array<{ tweet_id: string; score: number }>> {
        const redis_key = `trending:category:${category_id}`;
        const results = await this.redis_service.zrevrangeWithScores(redis_key, 0, limit - 1);

        const trending: Array<{ tweet_id: string; score: number }> = [];
        for (let i = 0; i < results.length; i += 2) {
            trending.push({
                tweet_id: results[i],
                score: parseFloat(results[i + 1]),
            });
        }
        return trending;
    }

    async getWhoToFollow() {}

    async getForYouPosts(current_user_id?: string) {
        const categories = await this.category_repository.find();
        const feed_structure: Array<{ category: string; items: { tweet_id: string; score: number }[] }> = [];
        const all_tweet_ids = new Set<string>();

        // Get Category Trending IDs
        for (const cat of categories) {
            const tweets = await this.getTrendingWithScores(String(cat.id),5);
            if (tweets.length > 0) {
                feed_structure.push({
                    category: cat.name,
                    items: tweets
                });
                tweets.forEach(t => all_tweet_ids.add(t.tweet_id));
            }
        }

        if (all_tweet_ids.size === 0) return [];

        // Fetch all tweets in one query using TweetsService
        const tweets = await this.tweets_service.getTweetsByIds(
            Array.from(all_tweet_ids),
            current_user_id
        );

        const tweets_map = new Map(tweets.map(t => [t.tweet_id, t]));

        return feed_structure.map(item => ({
            category: item.category,
            tweets: item.items
                .map(i => {
                    const tweet = tweets_map.get(i.tweet_id);
                    if (!tweet) return undefined;
                    return { ...tweet, score: i.score };
                })
                .filter(t => t !== undefined) 
        }));
    }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '../redis/redis.service';
import { Category } from '../category/entities/category.entity';
import { TweetsService } from '../tweets/tweets.service';

import { UserInterests } from 'src/user/entities/user-interests.entity';

@Injectable()
export class ExploreService {
    constructor(
        private readonly redis_service: RedisService,
        @InjectRepository(Category)
        private readonly category_repository: Repository<Category>,
        @InjectRepository(UserInterests)
        private readonly user_interests_repository: Repository<UserInterests>,
        private readonly tweets_service: TweetsService
    ) {}

    private readonly DEFAULT_CATEGORIES = [1, 2, 3, 4, 5];

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
    async getWhoToFollow() {
        return [];
    }
    async getCategoryTrending(
        category_id: string,
        current_user_id?: string,
        page: number = 1,
        limit: number = 20
    ) {
        const category = await this.category_repository.findOne({
            where: { id: parseInt(category_id) },
        });

        if (!category) {
            return {
                category: null,
                tweets: [],
                page,
                limit,
                hasMore: false,
            };
        }

        const offset = (page - 1) * limit;

        // Fetch limit + 1 to check if there are more results
        const tweet_ids = await this.getTrendingWithOffset(category_id, offset, limit + 1);

        const hasMore = tweet_ids.length > limit;
        const ids_to_return = hasMore ? tweet_ids.slice(0, limit) : tweet_ids;

        if (ids_to_return.length === 0) {
            return {
                category: { id: category.id, name: category.name },
                tweets: [],
                page,
                limit,
                hasMore: false,
            };
        }

        const tweets = await this.tweets_service.getTweetsByIds(ids_to_return, current_user_id);

        return {
            category: { id: category.id, name: category.name },
            tweets: tweets,
            pagination: {
                page,
                hasMore,
            },
        };
    }

    async getTrendingWithOffset(
        category_id: string,
        offset: number,
        limit: number
    ): Promise<string[]> {
        const redis_key = `trending:category:${category_id}`;
        return await this.redis_service.zrevrange(redis_key, offset, limit);
    }

    async getForYouPosts(current_user_id?: string) {
        const all_tweet_ids = new Set<string>();
        const time_before = Date.now();
        const user_interests = await this.user_interests_repository.find({
            where: { user_id: current_user_id },
            relations: ['category'],
            order: { score: 'DESC' },
            take: 5,
        });
        const time_after = Date.now();
        console.log('Time taken to fetch user interests:', time_after - time_before, 'ms');

        const categories = user_interests.map((interest) => interest.category);
        if (categories.length === 0) {
            // If no user interests, use default categories
            const default_cats = await this.category_repository.findByIds(this.DEFAULT_CATEGORIES);
            categories.push(...default_cats);
        }

        const keys = categories.map((cat) => `trending:category:${cat.id}`);
        const results = await this.redis_service.zrevrangeMultiple(keys, 0, 4);

        const feed_structure: Array<{
            category: string;
            category_id: number;
            items: { tweet_id: string }[];
        }> = [];

        results.forEach((raw_tweets, index) => {
            if (raw_tweets.length === 0) return;

            const tweets: { tweet_id: string; score: number }[] = [];
            for (let i = 0; i < raw_tweets.length; i += 2) {
                tweets.push({
                    tweet_id: raw_tweets[i],
                    score: parseFloat(raw_tweets[i + 1]),
                });
                all_tweet_ids.add(raw_tweets[i]);
            }

            if (tweets.length > 0) {
                feed_structure.push({
                    category: categories[index].name,
                    category_id: categories[index].id,
                    items: tweets,
                });
            }
        });

        if (all_tweet_ids.size === 0) return [];

        // Fetch all tweets in one query using TweetsService
        const tweets = await this.tweets_service.getTweetsByIds(
            Array.from(all_tweet_ids),
            current_user_id
        );

        return feed_structure.map((item) => ({
            category: { name: item.category, id: item.category_id },
            tweets: tweets.filter((tweet) => item.items.some((i) => i.tweet_id === tweet.tweet_id)),
        }));
    }
}

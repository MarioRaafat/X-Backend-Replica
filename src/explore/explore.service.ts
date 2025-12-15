import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RedisService } from '../redis/redis.service';
import { Category } from '../category/entities/category.entity';
import { TweetsService } from '../tweets/tweets.service';
import { UserInterests } from 'src/user/entities/user-interests.entity';
import { TrendService } from '../trend/trend.service';
import { WhoToFollowService } from './who-to-follow.service';

@Injectable()
export class ExploreService {
    constructor(
        private readonly redis_service: RedisService,
        @InjectRepository(Category)
        private readonly category_repository: Repository<Category>,
        @InjectRepository(UserInterests)
        private readonly user_interests_repository: Repository<UserInterests>,
        private readonly tweets_service: TweetsService,
        private readonly trend_service: TrendService,
        private readonly who_to_follow_service: WhoToFollowService
    ) {}

    private readonly DEFAULT_CATEGORIES = [2, 3, 5, 4, 15];

    async getExploreData(current_user_id?: string) {
        // This method would fetch all explore data in one go
        // Combining trending, who to follow, and for-you posts

        const [trending, who_to_follow, for_you] = await Promise.all([
            this.trend_service.getTrending('global', 5),
            this.who_to_follow_service.getWhoToFollow(current_user_id, 30),
            this.getForYouPosts(current_user_id),
        ]);

        return {
            trending,
            who_to_follow,
            for_you,
        };
    }

    async getWhoToFollow(current_user_id?: string, limit: number = 30) {
        return this.who_to_follow_service.getWhoToFollow(current_user_id, limit);
    }

    async getCategoryTrending(
        category_id: string,
        current_user_id?: string,
        page: number = 1,
        limit: number = 20
    ) {
        const category = await this.category_repository.findOne({
            where: { id: Number.parseInt(category_id) },
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

        const has_more = tweet_ids.length > limit;
        const ids_to_return = has_more ? tweet_ids.slice(0, limit) : tweet_ids;

        if (ids_to_return.length === 0) {
            return {
                category: { id: category.id, name: category.name },
                tweets: [],
                page,
                limit,
                hasMore: has_more,
            };
        }

        const tweets = await this.tweets_service.getTweetsByIds(ids_to_return, current_user_id);

        return {
            category: { id: category.id, name: category.name },
            tweets: tweets,
            pagination: {
                page,
                hasMore: has_more,
            },
        };
    }

    async getTrendingWithOffset(
        category_id: string,
        offset: number,
        limit: number
    ): Promise<string[]> {
        const redis_key = `explore:category:${category_id}`;
        return await this.redis_service.zrevrange(redis_key, offset, limit);
    }

    async getForYouPosts(current_user_id?: string) {
        const all_tweet_ids = new Set<string>();
        const time_before = Date.now();
        const user_interests = current_user_id
            ? await this.user_interests_repository
                  .createQueryBuilder('ui')
                  .innerJoinAndSelect('ui.category', 'c')
                  .where('ui.user_id = :uid', { uid: current_user_id })
                  .orderBy('ui.score', 'DESC')
                  .limit(5)
                  .getMany()
            : [];
        const time_after = Date.now();
        console.log('Time taken to fetch user interests:', time_after - time_before, 'ms');

        const categories = user_interests.map((interest) => interest.category);

        if (categories.length < 5) {
            // Fill remaining slots with default categories
            const existing_ids = categories.map((cat) => cat.id);
            const needed = 5 - categories.length;
            const qb = this.category_repository
                .createQueryBuilder('c')
                .where('c.id IN (:...ids)', { ids: this.DEFAULT_CATEGORIES })
                .orderBy('c.id', 'ASC')
                .limit(needed);

            if (existing_ids.length > 0) {
                qb.andWhere('c.id NOT IN (:...existing_ids)', { existing_ids });
            }

            const filler_cats = await qb.getMany();
            categories.push(...filler_cats);
        }
        const keys = categories.map((cat) => `explore:category:${cat.id}`);
        const results = await this.redis_service.zrevrangeMultiple(keys, 0, 4);

        const feed_structure: Array<{
            category: string;
            category_id: number;
            items: { tweet_id: string }[];
        }> = [];

        results.forEach((raw_tweets, index) => {
            if (raw_tweets.length === 0) return;

            const tweets: { tweet_id: string }[] = [];
            raw_tweets.forEach((tweet_id) => {
                tweets.push({ tweet_id });
                all_tweet_ids.add(tweet_id);
            });

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

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Tweet } from 'src/tweets/entities';
import { TweetsRepository } from 'src/tweets/tweets.repository';
import { UserInterests } from 'src/user/entities/user-interests.entity';
import { Repository } from 'typeorm';

@Injectable()
export class InterestsCandidateSource {
    constructor(
        @InjectRepository(UserInterests)
        private user_intersets_repository: Repository<UserInterests>,
        private readonly tweet_repository: TweetsRepository
    ) {}

    async getCandidates(user_id: string, limit: number = 100) {
        // Get user top 10 topics

        const user_intersets = await this.user_intersets_repository.find({
            where: { user_id: user_id },
            order: { score: 'DESC' },
            take: 10,
            select: ['category_id', 'score'],
        });

        if (user_intersets.length === 0) return [];

        // Get tweets by categories ids

        const category_ids = user_intersets.map((interest) => interest.category_id);

        const tweets = await this.tweet_repository.getRecentTweetsByCategoryIds(
            category_ids,
            user_id,
            {
                limit,
                since_hours_ago: 48,
            }
        );

        // TODO: Sort by percentage

        return {
            tweets,
            source: 'interests',
        };
    }
}

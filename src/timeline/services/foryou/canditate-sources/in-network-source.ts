import { Injectable } from '@nestjs/common';
import { TweetsRepository } from 'src/tweets/tweets.repository';
import { DataSource } from 'typeorm';

@Injectable()
export class InNetworkCandidateSource {
    constructor(private tweets_repository: TweetsRepository) {}

    async getCandidates(user_id: string, limit: number = 100) {
        const result = await this.tweets_repository.getFollowingTweets(
            user_id,
            undefined,
            limit,
            48
        );

        //TODO: Response from all candidates

        return result.data.map((tweet) => ({
            ...tweet,
            source: 'in_network',
        }));
    }
}

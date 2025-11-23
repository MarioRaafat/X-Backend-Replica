import { InterestsCandidateSource } from './canditate-sources/interests-source';
import { ForYouRanker } from './ranker/for-you-ranker.service';
import { ScoredCandidateDTO } from 'src/timeline/dto/scored-candidates.dto';

export class ForyouService {
    constructor(
        private readonly interest_source: InterestsCandidateSource,
        private readonly ranker: ForYouRanker
    ) {}

    async getForyouTimeline(
        user_id: string,
        cursor?: string,
        limit: number = 20
    ): Promise<{
        data: ScoredCandidateDTO[];
        pagination: { next_cursor: string | null; has_more: boolean };
    }> {
        const { data: interest_tweets, pagination } = await this.interest_source.getCandidates(
            user_id,
            cursor,
            limit
        );

        const ranked_tweets = this.ranker.rank(interest_tweets);

        // apply final combined cursor from each source

        return {
            data: ranked_tweets,
            pagination: {
                next_cursor: '',
                has_more: ranked_tweets.length === limit,
            },
        };
    }
}

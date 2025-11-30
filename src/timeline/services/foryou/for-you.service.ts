import { Injectable } from '@nestjs/common';
import { InterestsCandidateSource } from './canditate-sources/interests-source';
import { ScoredCandidateDTO } from 'src/timeline/dto/scored-candidates.dto';
@Injectable()
export class ForyouService {
    constructor(private readonly interest_source: InterestsCandidateSource) {}

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

        // apply final combined cursor from each source

        return {
            data: interest_tweets,
            pagination,
        };
    }
}

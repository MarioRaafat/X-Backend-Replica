import { Injectable } from '@nestjs/common';
import { ScoredCandidateDTO } from 'src/timeline/dto/scored-candidates.dto';

@Injectable()
export class ForYouRanker {
    /**
     * Ranks candidates using all extracted features
     * Returns sorted array
     */
    rank(candidates: ScoredCandidateDTO[]): ScoredCandidateDTO[] {
        if (candidates.length === 0) return [];

        // Step 1: Calculate final score for each candidate
        const scored_candidates = candidates.map((candidate) => {
            const {
                recency_score,
                relevance_score,
                engagement_score,
                media_boost,
                credibility_boost,
                virality_score,
                location_boost = 0,
                diversity_penalty = 0,
            } = candidate;

            // Final ranking formula — tuned for real-world feel
            const final_score =
                recency_score * 1.0 + // 0–40
                relevance_score * 0.9 + // e.g. 0–600+ → dominant signal
                engagement_score * 1.0 + // 0–100+
                media_boost * 1.2 + // media is king
                credibility_boost * 0.8 +
                virality_score * 1.3 +
                location_boost * 1.0 +
                diversity_penalty; // negative

            return {
                ...candidate,
                _final_score: final_score,
            };
        });

        // Step 2: Primary sort by final score
        scored_candidates.sort((a, b) => b._final_score - a._final_score);

        // Step 3: Diversity pass — prevent author/topic redunduncy
        const result: ScoredCandidateDTO[] = [];
        const seen_authors = new Set<string>();

        for (const candidate of scored_candidates) {
            const author_id = candidate.tweet.user.id;

            let penalty = 0;

            // Author diversity: max 3 posts per author in top 30
            if (seen_authors.has(author_id)) {
                penalty -= 10;
            }

            //TODO:  Topic diversity: avoid same topic dominating -> later
            // Apply penalty
            candidate.diversity_penalty = penalty;
            candidate._final_score += penalty;

            seen_authors.add(author_id);

            result.push(candidate);
        }

        // Final sort after diversity penalties
        result.sort((a, b) => b._final_score! - a._final_score!);
        return result;
    }
}

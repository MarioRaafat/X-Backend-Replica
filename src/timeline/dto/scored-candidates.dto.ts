import { Expose } from 'class-transformer';
import { TweetResponseDTO } from 'src/tweets/dto/tweet-response.dto';

export class ScoredCandidateDTO extends TweetResponseDTO {
    // === Numeric features
    @Expose()
    recency_score: number; // 0–1 (1 = just posted)
    @Expose()
    tweet_category_id?: number;
    @Expose()
    relevance_score: number = 0; // 0–100 (interests + similarity)
    @Expose()
    engagement_score: number; // (likes + 3×retweets + ...)
    @Expose()
    media_boost: number; // 0, 10, 15
    @Expose()
    credibility_boost: number; // verified? follower ratio?
    @Expose()
    diversity_penalty: number; // negative if same author/topic
    @Expose()
    location_boost: number; // 0 or 20 if same country/city
    @Expose()
    virality_score: number; // trending velocity

    // source: string;
    // will be added
    @Expose()
    author_similarity?: number;
    @Expose()
    _final_score?: number;
}

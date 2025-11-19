import { TweetResponseDTO } from 'src/tweets/dto/tweet-response.dto';

export class ScoredCandidateDTO {
    tweet: TweetResponseDTO;

    // === Numeric features
    recency_score: number; // 0–1 (1 = just posted)
    relevance_score: number; // 0–100 (interests + similarity)
    engagement_score: number; // (likes + 3×retweets + ...)
    media_boost: number; // 0, 10, 15
    credibility_boost: number; // verified? follower ratio?
    diversity_penalty: number; // negative if same author/topic
    location_boost: number; // 0 or 20 if same country/city
    virality_score: number; // trending velocity

    // source: string;
    // will be added
    author_similarity?: number;
}

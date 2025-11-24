// import { Injectable } from '@nestjs/common';
// import { ScoredCandidateDTO } from 'src/timeline/dto/scored-candidates.dto';
// import { TweetResponseDTO } from 'src/tweets/dto';
// import { TweetsRepository } from 'src/tweets/tweets.repository';
// import { UserRepository } from 'src/user/user.repository';

// @Injectable()
// export class FeatureExtractor {
//     constructor(
//         private tweet_repository: TweetsRepository,
//         private user_repository: UserRepository
//     ) {}
//     async extract(candidates: TweetResponseDTO[], user_id: string): Promise<ScoredCandidateDTO[]> {
//         if (candidates.length === 0) return [];

//         const tweet_ids = candidates.map((t) => t.tweet_id);

//         const [tweet_categories_map, user_interests] = await Promise.all([
//             this.tweet_repository.getTweetsCategories(tweet_ids),
//             this.user_repository.getUserInterests(user_id),
//         ]);

//         // Pre-build lookup maps
//         const interets_map = Object.fromEntries(
//             user_interests.map((i) => [i.category_id, i.score])
//         );

//         const now = Date.now();

//         return candidates.map((tweet) => {
//             const categories = tweet_categories_map[tweet.tweet_id] || [];

//             return {
//                 tweet,

//                 // 1. Recency
//                 recency_score: this.calculateRecency(tweet),

//                 // 2. Relevance
//                 relevance_score: this.calculateRelevance(categories, interets_map),

//                 // 3. Engagement
//                 engagement_score: this.calculateEngagement(tweet),

//                 // 4. Media
//                 media_boost: this.calculateMediaBoost(tweet),

//                 // 5. Credibility
//                 credibility_boost: this.calculateCredibility(tweet),

//                 // 6. Virality (future)
//                 virality_score: 0,

//                 // 7. Location (future)
//                 location_boost: 0,

//                 // 8. Diversity (applied later in ranker)
//                 diversity_penalty: 0,

//                 // 9. Future similarity
//                 author_similarity: 0,
//             };
//         });
//     }

//     private calculateRelevance(
//         categories: { category_id: number; percentage: number }[],
//         interset_map: Record<number, number>
//     ): number {
//         if (categories.length === 0) return 0;
//         return categories.reduce((sum, { category_id, percentage }) => {
//             const user_score = interset_map[category_id] ?? 0;
//             return sum + user_score * percentage;
//         }, 0);
//     }

//     private calculateRecency(tweet: TweetResponseDTO): number {
//         const duration = Date.now() - new Date(tweet.created_at).getTime();

//         // to be changed
//         return duration;
//     }
//     private calculateEngagement(tweet: TweetResponseDTO): number {
//         return (
//             Math.log1p(
//                 tweet.likes_count +
//                     tweet.replies_count * 3 +
//                     tweet.quotes_count * 3 +
//                     tweet.reposts_count * 2 +
//                     tweet.views_count * 0.01
//             ) * 12
//         );
//     }
//     private calculateMediaBoost(tweet: TweetResponseDTO): number {
//         return tweet.images?.length || tweet.videos?.length ? 18 : 0;
//     }

//     private calculateCredibility(tweet: TweetResponseDTO): number {
//         return tweet.user.verified ? 25 : 0;
//     }
// }

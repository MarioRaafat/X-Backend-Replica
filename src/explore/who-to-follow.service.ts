import { Injectable } from '@nestjs/common';
import { UserRepository } from '../user/user.repository';

@Injectable()
export class WhoToFollowService {
    private readonly CONFIG = {
        // thresholds
        MAX_MUTUAL_CONNECTIONS_THRESHOLD: 10,
        MAX_LIKES_THRESHOLD: 10,
        MAX_REPLIES_THRESHOLD: 10,
        MAX_COMMON_CATEGORIES_THRESHOLD: 2,

        // Distribution percentages
        DISTRIBUTION: {
            FRIENDS_OF_FRIENDS: 40,
            LIKES: 25,
            INTERESTS: 10,

            REPLIES: 15,
            FOLLOWERS_NOT_FOLLOWED: 10,
        },

        CANDIDATE_MULTIPLIER: 3,
    };

    constructor(private readonly user_repository: UserRepository) {}

    async getWhoToFollow(current_user_id?: string, limit: number = 30) {
        if (!current_user_id) {
            return this.getPopularUsers(limit);
        }

        const recommendations = await this.getPersonalizedRecommendations(current_user_id, limit);

        // If we don't have enough recommendations, fill with popular users
        if (recommendations.length < limit) {
            const needed = limit - recommendations.length;
            const existing_ids = new Set(recommendations.map((r) => r.id));

            const additional_users = await this.getPopularUsers(needed * 2); // Get extra to filter
            const filtered_additional = additional_users
                .filter((user) => !existing_ids.has(user.id))
                .slice(0, needed);

            recommendations.push(...filtered_additional);
        }

        return recommendations;
    }

    private async getPopularUsers(limit: number) {
        const users = await this.user_repository
            .createQueryBuilder('user')
            .select([
                'user.id',
                'user.username',
                'user.name',
                'user.bio',
                'user.avatar_url',
                'user.verified',
                'user.followers',
                'user.following',
            ])
            .where('user.deleted_at IS NULL')
            .orderBy('user.followers', 'DESC')
            .addOrderBy('user.verified', 'DESC')
            .limit(limit)
            .getMany();

        return users.map((user) => ({
            id: user.id,
            username: user.username,
            name: user.name,
            bio: user.bio || '',
            avatar_url: user.avatar_url || '',
            verified: user.verified || false,
            followers: user.followers || 0,
            following: user.following || 0,
            is_following: false,
            is_followed: false,
        }));
    }

    private async getPersonalizedRecommendations(current_user_id: string, limit: number) {
        const distribution = this.CONFIG.DISTRIBUTION;
        const candidate_multiplier = this.CONFIG.CANDIDATE_MULTIPLIER;

        const limits = {
            fof: Math.ceil((limit * distribution.FRIENDS_OF_FRIENDS) / 100) * candidate_multiplier,
            interests: Math.ceil((limit * distribution.INTERESTS) / 100) * candidate_multiplier,
            likes: Math.ceil((limit * distribution.LIKES) / 100) * candidate_multiplier,
            replies: Math.ceil((limit * distribution.REPLIES) / 100) * candidate_multiplier,
            followers:
                Math.ceil((limit * distribution.FOLLOWERS_NOT_FOLLOWED) / 100) *
                candidate_multiplier,
        };

        //queries in parallel
        const [
            friends_of_friends,
            interest_based,
            liked_users,
            replied_users,
            followers_not_followed,
        ] = await Promise.all([
            this.getFriendsOfFriends(current_user_id, limits.fof),
            this.getInterestBasedUsers(current_user_id, limits.interests),
            this.getLikedUsers(current_user_id, limits.likes),
            this.getRepliedUsers(current_user_id, limits.replies),
            this.getFollowersNotFollowed(current_user_id, limits.followers),
        ]);

        // console.log('\n=== WHO TO FOLLOW DEBUG ===');
        // console.log(`Friends of Friends: ${friends_of_friends.length} users`);
        // console.log(`Interest-Based: ${interest_based.length} users`);
        // console.log(`Liked Users: ${liked_users.length} users`);
        // console.log(`Replied Users: ${replied_users.length} users`);
        // console.log(`Followers Not Followed: ${followers_not_followed.length} users`);

        // Combine users from different sources with distribution-based approach
        const combined_users_with_metadata = this.combineByDistribution(
            friends_of_friends,
            interest_based,
            liked_users,
            replied_users,
            followers_not_followed,
            limit
        );

        if (combined_users_with_metadata.length === 0) {
            return [];
        }

        const user_ids = combined_users_with_metadata.map((u) => u.user_id);

        const users = await this.user_repository
            .createQueryBuilder('user')
            .select([
                'user.id',
                'user.username',
                'user.name',
                'user.bio',
                'user.avatar_url',
                'user.verified',
                'user.followers',
                'user.following',
            ])
            .addSelect(
                `EXISTS(
                    SELECT 1 FROM user_follows uf
                    WHERE uf.follower_id = :current_user_id AND uf.followed_id = "user"."id"
                )`,
                'is_following'
            )
            .addSelect(
                `EXISTS(
                    SELECT 1 FROM user_follows uf
                    WHERE uf.follower_id = "user"."id" AND uf.followed_id = :current_user_id
                )`,
                'is_followed'
            )
            .where('user.id IN (:...user_ids)', { user_ids })
            .andWhere('user.deleted_at IS NULL')
            .setParameter('current_user_id', current_user_id)
            .getRawMany();

        const user_map = new Map(users.map((u) => [u.user_id, u]));

        // Map with metadata and filter out missing users
        const users_with_scores = combined_users_with_metadata
            .map((metadata) => {
                const user = user_map.get(metadata.user_id);
                if (!user) return null;
                return {
                    user,
                    score: metadata.score,
                    source: metadata.source,
                    source_data: metadata.source_data,
                };
            })
            .filter((u) => u !== null);

        // console.log('\n=== FINAL RECOMMENDATIONS (ordered by score) ===');
        // users_with_scores.forEach((item, index) => {
        //     console.log(
        //         `${index + 1}. @${item.user.user_username} - Score: ${item.score.toFixed(2)} - Source: ${item.source} - Data:`,
        //         item.source_data
        //     );
        // });
        // console.log('=========================\n');

        return users_with_scores.map((item) => ({
            id: item.user.user_id,
            username: item.user.user_username,
            name: item.user.user_name,
            bio: item.user.user_bio || '',
            avatar_url: item.user.user_avatar_url || '',
            verified: item.user.user_verified || false,
            followers: item.user.user_followers || 0,
            following: item.user.user_following || 0,
            is_following: item.user.is_following || false,
            is_followed: item.user.is_followed || false,
        }));
    }

    private calculateScore(
        user: any,
        source: 'fof' | 'interests' | 'likes' | 'replies' | 'followers'
    ): number {
        const thresholds = this.CONFIG;

        switch (source) {
            case 'fof': {
                const normalized = Math.min(
                    (user.mutual_count / thresholds.MAX_MUTUAL_CONNECTIONS_THRESHOLD) * 100,
                    100
                );
                return normalized;
            }

            case 'interests': {
                const category_score = Math.min(
                    (user.common_categories / thresholds.MAX_COMMON_CATEGORIES_THRESHOLD) * 60,
                    60
                );
                const interest_score = Math.min((user.avg_interest_score / 100) * 40, 40);
                return category_score + interest_score;
            }

            case 'likes': {
                const normalized = Math.min(
                    (user.like_count / thresholds.MAX_LIKES_THRESHOLD) * 100,
                    100
                );
                return normalized;
            }

            case 'replies': {
                const normalized = Math.min(
                    (user.reply_count / thresholds.MAX_REPLIES_THRESHOLD) * 100,
                    100
                );
                return normalized;
            }

            case 'followers': {
                return 50;
            }

            default:
                return 0;
        }
    }

    private combineByDistribution(
        fof_users: Array<{ user_id: string; mutual_count: number }>,
        interest_users: Array<{
            user_id: string;
            common_categories: number;
            avg_interest_score: number;
        }>,
        liked_users: Array<{ user_id: string; like_count: number }>,
        replied_users: Array<{ user_id: string; reply_count: number }>,
        followers_users: Array<{ user_id: string }>,
        limit: number
    ): Array<{ user_id: string; score: number; source: string; source_data: any }> {
        const distribution = this.CONFIG.DISTRIBUTION;
        const scored_users: Array<{
            user_id: string;
            score: number;
            source: string;
            source_data: any;
        }> = [
            ...fof_users.map((u) => ({
                user_id: u.user_id,
                score: this.calculateScore(u, 'fof'),
                source: 'Friends of Friends',
                source_data: u,
            })),
            ...interest_users.map((u) => ({
                user_id: u.user_id,
                score: this.calculateScore(u, 'interests'),
                source: 'Interest-Based',
                source_data: u,
            })),
            ...liked_users.map((u) => ({
                user_id: u.user_id,
                score: this.calculateScore(u, 'likes'),
                source: 'Liked Users',
                source_data: u,
            })),
            ...replied_users.map((u) => ({
                user_id: u.user_id,
                score: this.calculateScore(u, 'replies'),
                source: 'Replied Users',
                source_data: u,
            })),
            ...followers_users.map((u) => ({
                user_id: u.user_id,
                score: this.calculateScore(u, 'followers'),
                source: 'Followers Not Followed',
                source_data: u,
            })),
        ];

        const by_source = {
            fof: scored_users.filter((u) => u.source === 'Friends of Friends'),
            interests: scored_users.filter((u) => u.source === 'Interest-Based'),
            likes: scored_users.filter((u) => u.source === 'Liked Users'),
            replies: scored_users.filter((u) => u.source === 'Replied Users'),
            followers: scored_users.filter((u) => u.source === 'Followers Not Followed'),
        };

        const counts = {
            fof: Math.ceil((limit * distribution.FRIENDS_OF_FRIENDS) / 100),
            interests: Math.ceil((limit * distribution.INTERESTS) / 100),
            likes: Math.ceil((limit * distribution.LIKES) / 100),
            replies: Math.ceil((limit * distribution.REPLIES) / 100),
            followers: Math.ceil((limit * distribution.FOLLOWERS_NOT_FOLLOWED) / 100),
        };

        const result: Array<{ user_id: string; score: number; source: string; source_data: any }> =
            [];
        const seen = new Set<string>();

        // Take top users from each source according to distribution
        const add_from_source = (users: any[], count: number) => {
            let added = 0;
            for (const user of users) {
                if (added >= count) break;
                if (!seen.has(user.user_id)) {
                    result.push(user);
                    seen.add(user.user_id);
                    added++;
                }
            }
            return added;
        };

        const actual_counts = {
            fof: add_from_source(by_source.fof, counts.fof),
            interests: add_from_source(by_source.interests, counts.interests),
            likes: add_from_source(by_source.likes, counts.likes),
            replies: add_from_source(by_source.replies, counts.replies),
            followers: add_from_source(by_source.followers, counts.followers),
        };

        console.log(
            `\nActual distribution: FoF=${actual_counts.fof}, Interests=${actual_counts.interests}, Likes=${actual_counts.likes}, Replies=${actual_counts.replies}, Followers=${actual_counts.followers}`
        );

        if (result.length < limit) {
            const all_remaining = scored_users
                .filter((u) => !seen.has(u.user_id))
                .sort((a, b) => b.score - a.score);

            for (const user of all_remaining) {
                if (result.length >= limit) break;
                result.push({
                    ...user,
                    source: `${user.source} (extra)`,
                });
                seen.add(user.user_id);
            }
        }

        result.sort((a, b) => b.score - a.score);

        return result.slice(0, limit);
    }

    private async getFriendsOfFriends(current_user_id: string, limit: number) {
        const result = await this.user_repository.query(
            `
            WITH user_following AS (
                SELECT followed_id 
                FROM user_follows 
                WHERE follower_id = $1
            ),
            user_blocks AS (
                SELECT blocked_id FROM user_blocks WHERE blocker_id = $1
                UNION
                SELECT blocker_id FROM user_blocks WHERE blocked_id = $1
            )
            SELECT 
                uf2.followed_id as user_id,
                COUNT(DISTINCT uf2.follower_id) as mutual_count
            FROM user_follows uf2
            WHERE uf2.follower_id IN (SELECT followed_id FROM user_following)
                AND uf2.followed_id != $1
                AND uf2.followed_id NOT IN (SELECT followed_id FROM user_following)
                AND uf2.followed_id NOT IN (SELECT blocked_id FROM user_blocks)
            GROUP BY uf2.followed_id
            ORDER BY mutual_count DESC
            LIMIT $2
        `,
            [current_user_id, limit]
        );

        return result.map((r) => ({
            user_id: r.user_id,
            mutual_count: Number.parseInt(r.mutual_count),
        }));
    }

    private async getInterestBasedUsers(current_user_id: string, limit: number) {
        const result = await this.user_repository.query(
            `
            WITH user_categories AS (
                SELECT category_id, score 
                FROM user_interests 
                WHERE user_id = $1
            ),
            user_following AS (
                SELECT followed_id 
                FROM user_follows 
                WHERE follower_id = $1
            ),
            user_blocks AS (
                SELECT blocked_id FROM user_blocks WHERE blocker_id = $1
                UNION
                SELECT blocker_id FROM user_blocks WHERE blocked_id = $1
            )
            SELECT 
                ui.user_id,
                COUNT(DISTINCT ui.category_id) as common_categories,
                AVG(ui.score) as avg_interest_score
            FROM user_interests ui
            INNER JOIN user_categories uc ON ui.category_id = uc.category_id
            WHERE ui.user_id != $1
                AND ui.user_id NOT IN (SELECT followed_id FROM user_following)
                AND ui.user_id NOT IN (SELECT blocked_id FROM user_blocks)
            GROUP BY ui.user_id
            HAVING COUNT(DISTINCT ui.category_id) >= 1
            ORDER BY common_categories DESC, avg_interest_score DESC
            LIMIT $2
        `,
            [current_user_id, limit]
        );

        return result.map((r) => ({
            user_id: r.user_id,
            common_categories: Number.parseInt(r.common_categories),
            avg_interest_score: Number.parseFloat(r.avg_interest_score),
        }));
    }

    private async getLikedUsers(current_user_id: string, limit: number) {
        const result = await this.user_repository.query(
            `
            WITH user_following AS (
                SELECT followed_id 
                FROM user_follows 
                WHERE follower_id = $1
            ),
            user_blocks AS (
                SELECT blocked_id FROM user_blocks WHERE blocker_id = $1
                UNION
                SELECT blocker_id FROM user_blocks WHERE blocked_id = $1
            )
            SELECT 
                t.user_id,
                COUNT(DISTINCT tl.tweet_id) as like_count,
                MAX(tl.created_at) as last_interaction
            FROM tweet_likes tl
            INNER JOIN tweets t ON tl.tweet_id = t.tweet_id
            WHERE tl.user_id = $1
                AND t.user_id != $1
                AND t.user_id NOT IN (SELECT followed_id FROM user_following)
                AND t.user_id NOT IN (SELECT blocked_id FROM user_blocks)
            GROUP BY t.user_id
            ORDER BY like_count DESC, last_interaction DESC
            LIMIT $2
        `,
            [current_user_id, limit]
        );

        return result.map((r) => ({
            user_id: r.user_id,
            like_count: Number.parseInt(r.like_count),
        }));
    }

    private async getRepliedUsers(current_user_id: string, limit: number) {
        const result = await this.user_repository.query(
            `
            WITH user_following AS (
                SELECT followed_id 
                FROM user_follows 
                WHERE follower_id = $1
            ),
            user_blocks AS (
                SELECT blocked_id FROM user_blocks WHERE blocker_id = $1
                UNION
                SELECT blocker_id FROM user_blocks WHERE blocked_id = $1
            )
            SELECT 
                parent.user_id,
                COUNT(DISTINCT reply.tweet_id) as reply_count,
                MAX(reply.created_at) as last_interaction
            FROM tweets reply
            INNER JOIN tweet_replies tr ON reply.tweet_id = tr.reply_tweet_id
            INNER JOIN tweets parent ON tr.original_tweet_id = parent.tweet_id
            WHERE reply.user_id = $1
                AND parent.user_id != $1
                AND parent.user_id NOT IN (SELECT followed_id FROM user_following)
                AND parent.user_id NOT IN (SELECT blocked_id FROM user_blocks)
            GROUP BY parent.user_id
            ORDER BY reply_count DESC, last_interaction DESC
            LIMIT $2
        `,
            [current_user_id, limit]
        );

        return result.map((r) => ({
            user_id: r.user_id,
            reply_count: Number.parseInt(r.reply_count),
        }));
    }

    private async getFollowersNotFollowed(current_user_id: string, limit: number) {
        const result = await this.user_repository.query(
            `
            WITH user_following AS (
                SELECT followed_id 
                FROM user_follows 
                WHERE follower_id = $1
            ),
            user_blocks AS (
                SELECT blocked_id FROM user_blocks WHERE blocker_id = $1
                UNION
                SELECT blocker_id FROM user_blocks WHERE blocked_id = $1
            )
            SELECT 
                uf.follower_id as user_id,
                u.followers,
                u.verified
            FROM user_follows uf
            INNER JOIN "user" u ON u.id = uf.follower_id
            WHERE uf.followed_id = $1
                AND uf.follower_id NOT IN (SELECT followed_id FROM user_following)
                AND uf.follower_id NOT IN (SELECT blocked_id FROM user_blocks)
            ORDER BY u.verified DESC, u.followers DESC
            LIMIT $2
        `,
            [current_user_id, limit]
        );

        return result.map((r) => ({
            user_id: r.user_id,
        }));
    }
}

import { Injectable } from '@nestjs/common';
import { BasicQueryDto } from './dto/basic-query.dto';
import { SearchQueryDto } from './dto/search-query.dto';
import { PostsSearchDto } from './dto/post-search.dto';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { UserListResponseDto } from 'src/user/dto/user-list-response.dto';
import { UserRepository } from 'src/user/user.repository';
import { ELASTICSEARCH_INDICES } from 'src/elasticsearch/schemas';
import { TweetListResponseDto } from './dto/tweet-list-response.dto';
import { Brackets } from 'typeorm';
import { UserListItemDto } from 'src/user/dto/user-list-item.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class SearchService {
    constructor(
        private readonly elasticsearch_service: ElasticsearchService,
        private readonly user_repository: UserRepository
    ) {}

    async getSuggestions(current_user_id: string, query_dto: BasicQueryDto) {}

    async searchUsers(
        current_user_id: string,
        query_dto: SearchQueryDto
    ): Promise<UserListResponseDto> {
        const { query, cursor, limit = 20 } = query_dto;

        const sanitized_query = query.replace(/[^\w\s]/gi, '');

        if (!sanitized_query.trim()) {
            return { data: [], pagination: { next_cursor: null, has_more: false } };
        }

        const prefix_query = sanitized_query
            .split(/\s+/)
            .filter(Boolean)
            .map((term) => `${term}:*`)
            .join(' & ');

        let cursor_score: number | null = null;
        let cursor_id: string | null = null;

        if (cursor) {
            try {
                const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
                cursor_score = decoded.score;
                cursor_id = decoded.id;
            } catch (error) {
                throw new Error('Invalid cursor');
            }
        }

        const fetch_limit = limit + 1;

        const query_builder = this.user_repository
            .createQueryBuilder('user')
            .select([
                '"user".id AS id',
                '"user".name AS name',
                '"user".username AS username',
                '"user".bio AS bio',
                '"user".avatar_url AS avatar_url',
                '"user".cover_url AS cover_url',
                '"user".verified AS verified',
                '"user".followers AS followers',
                '"user".following AS following',
            ])
            .addSelect(
                `EXISTS(SELECT 1 FROM user_follows WHERE followed_id = "user".id AND follower_id = :current_user_id)`,
                'is_following'
            )
            .addSelect(
                `EXISTS(SELECT 1 FROM user_follows WHERE follower_id = "user".id AND followed_id = :current_user_id)`,
                'is_follower'
            )
            .addSelect(
                `(
                  (CASE WHEN EXISTS(SELECT 1 FROM user_follows WHERE followed_id = "user".id AND follower_id = :current_user_id) THEN 1000000 ELSE 0 END) +
                  (ts_rank("user".search_vector, to_tsquery('simple', :prefix_query)) * 1000) +
                  ("user".followers::float / 1000000)
                )`,
                'total_score'
            )
            .where(
                new Brackets((qb) => {
                    qb.where(`"user".search_vector @@ to_tsquery('simple', :prefix_query)`, {
                        prefix_query,
                    })
                        .orWhere('"user".username ILIKE :like_query', {
                            like_query: `${sanitized_query}%`,
                        })
                        .orWhere('"user".name ILIKE :like_query', {
                            like_query: `${sanitized_query}%`,
                        });
                })
            );

        if (cursor && cursor_score !== null && cursor_id !== null) {
            query_builder.andWhere(
                new Brackets((qb) => {
                    qb.where('total_score < :cursor_score', { cursor_score }).orWhere(
                        new Brackets((qb2) => {
                            qb2.where('total_score = :cursor_score', { cursor_score }).andWhere(
                                '"user".id > :cursor_id',
                                { cursor_id }
                            );
                        })
                    );
                })
            );
        }

        query_builder.setParameters({
            current_user_id,
            prefix_query,
            like_query: `${sanitized_query}%`,
        });

        const results = await query_builder
            .orderBy('total_score', 'DESC')
            .addOrderBy('user.id', 'ASC')
            .limit(fetch_limit)
            .getRawMany();

        const has_more = results.length > limit;
        const users = has_more ? results.slice(0, limit) : results;

        let next_cursor: string | null = null;
        if (has_more && users.length > 0) {
            const last_user = users[users.length - 1];
            const cursor_data = {
                score: last_user.total_score,
                id: last_user.id,
            };
            next_cursor = Buffer.from(JSON.stringify(cursor_data)).toString('base64');
        }

        const users_list = users.map((user) =>
            plainToInstance(UserListItemDto, user, {
                enableImplicitConversion: true,
            })
        );

        return {
            data: users_list,
            pagination: {
                next_cursor,
                has_more,
            },
        };
    }

    async searchUsers2(
        current_user_id: string,
        query_dto: SearchQueryDto
    ): Promise<UserListResponseDto> {
        const { query } = query_dto;

        const { cursor, limit = 20 } = query_dto;

        if (!query || query.trim().length === 0) {
            return {
                data: [],
                pagination: {
                    next_cursor: null,
                    has_more: false,
                },
            };
        }

        try {
            const search_body: any = {
                query: {
                    bool: {
                        must: [],
                        filter: [],
                    },
                },
                size: limit + 1,
                sort: [
                    { _score: { order: 'desc' } },
                    { followers: { order: 'desc' } },
                    { user_id: { order: 'desc' } },
                ],
            };

            if (cursor) {
                search_body.search_after = this.decodeCursor(cursor);
            }

            search_body.query.bool.must.push({
                multi_match: {
                    query: query.trim(),
                    fields: [
                        'username^3',
                        'username.autocomplete^2',
                        'name^2',
                        'name.autocomplete',
                        'bio',
                    ],
                    type: 'best_fields',
                    fuzziness: 'AUTO',
                    prefix_length: 1,
                    operator: 'or',
                },
            });

            const result = await this.elasticsearch_service.search({
                index: 'users',
                body: search_body,
            });

            const hits = result.hits.hits;

            const has_more = hits.length > limit;
            const items = has_more ? hits.slice(0, limit) : hits;

            let next_cursor: string | null = null;

            if (has_more) {
                const last_hit = hits[limit - 1];
                next_cursor = this.encodeCursor(last_hit.sort) ?? null;
            }

            const users = items.map((hit: any) => ({
                user_id: hit._source.user_id,
                username: hit._source.username,
                name: hit._source.name,
                bio: hit._source.bio,
                country: hit._source.country,
                followers: hit._source.followers,
                following: hit._source.following,
                verified: hit._source.verified,
                avatar_url: hit._source.avatar_url,
            }));

            return {
                data: users,
                pagination: {
                    next_cursor,
                    has_more,
                },
            };
        } catch (error) {
            console.log(error);
            return {
                data: [],
                pagination: {
                    next_cursor: null,
                    has_more: false,
                },
            };
        }
    }

    async searchPosts(
        current_user_id: string,
        query_dto: PostsSearchDto
    ): Promise<TweetListResponseDto> {
        const { query, cursor, limit = 20, has_media } = query_dto;

        if (!query || query.trim().length === 0) {
            return {
                data: [],
                pagination: {
                    next_cursor: null,
                    has_more: false,
                },
            };
        }

        try {
            const search_body: any = {
                query: {
                    bool: {
                        must: [],
                        should: [],
                    },
                },
                size: limit + 1,
                sort: [
                    { _score: { order: 'desc' } },
                    { created_at: { order: 'desc' } },
                    { tweet_id: { order: 'desc' } },
                ],
            };

            if (cursor) {
                search_body.search_after = this.decodeCursor(cursor);
            }

            search_body.query.bool.must.push({
                multi_match: {
                    query: query.trim(),
                    fields: ['content^3', 'username^2', 'name'],
                    type: 'best_fields',
                    fuzziness: 'AUTO',
                    prefix_length: 1,
                    operator: 'or',
                },
            });

            this.applyTweetsBoosting(search_body);

            if (has_media) {
                search_body.query.bool.filter = search_body.query.bool.filter || [];
                search_body.query.bool.filter.push({
                    script: {
                        script: {
                            source: "(doc['images'].size() > 0 || doc['videos'].size() > 0)",
                        },
                    },
                });
            }

            const result = await this.elasticsearch_service.search({
                index: ELASTICSEARCH_INDICES.TWEETS,
                body: search_body,
            });

            const hits = result.hits.hits;

            const has_more = hits.length > limit;
            const items = has_more ? hits.slice(0, limit) : hits;

            let next_cursor: string | null = null;

            if (has_more) {
                const last_hit = hits[limit - 1];
                next_cursor = this.encodeCursor(last_hit.sort) ?? null;
            }

            const mapped_tweets = await this.attachRelatedTweets(items);

            return {
                data: mapped_tweets,
                pagination: {
                    next_cursor,
                    has_more,
                },
            };
        } catch (error) {
            console.log(error);
            return {
                data: [],
                pagination: {
                    next_cursor: null,
                    has_more: false,
                },
            };
        }
    }

    async searchLatestPosts(
        current_user_id: string,
        query_dto: SearchQueryDto
    ): Promise<TweetListResponseDto> {
        const { query, cursor, limit = 20 } = query_dto;

        if (!query || query.trim().length === 0) {
            return {
                data: [],
                pagination: {
                    next_cursor: null,
                    has_more: false,
                },
            };
        }

        try {
            const search_body: any = {
                query: {
                    bool: {
                        must: [],
                        should: [],
                    },
                },
                size: limit + 1,
                sort: [
                    { created_at: { order: 'desc' } },
                    { _score: { order: 'desc' } },
                    { tweet_id: { order: 'desc' } },
                ],
            };

            if (cursor) {
                search_body.search_after = this.decodeCursor(cursor);
            }

            search_body.query.bool.must.push({
                multi_match: {
                    query: query.trim(),
                    fields: ['content^3', 'username^2', 'name'],
                    type: 'best_fields',
                    fuzziness: 'AUTO',
                    prefix_length: 1,
                    operator: 'or',
                },
            });

            this.applyTweetsBoosting(search_body);

            const result = await this.elasticsearch_service.search({
                index: ELASTICSEARCH_INDICES.TWEETS,
                body: search_body,
            });

            const hits = result.hits.hits;

            const has_more = hits.length > limit;
            const items = has_more ? hits.slice(0, limit) : hits;

            let next_cursor: string | null = null;

            if (has_more) {
                const last_hit = hits[limit - 1];
                next_cursor = this.encodeCursor(last_hit.sort) ?? null;
            }

            const mapped_tweets = await this.attachRelatedTweets(items);

            return {
                data: mapped_tweets,
                pagination: {
                    next_cursor,
                    has_more,
                },
            };
        } catch (error) {
            console.log(error);
            return {
                data: [],
                pagination: {
                    next_cursor: null,
                    has_more: false,
                },
            };
        }
    }

    private mapTweet(hit: any, parent_source?: any, conversation_source?: any) {
        const s = hit._source;

        const tweet = {
            tweet_id: s.tweet_id,
            type: s.type,
            content: s.content,
            created_at: s.created_at,
            updated_at: s.updated_at,

            likes_count: s.num_likes,
            reposts_count: s.num_reposts,
            views_count: s.num_views,
            replies_count: s.num_replies,
            quotes_count: s.num_quotes,

            user: {
                id: s.author_id,
                username: s.username,
                name: s.name,
                avatar_url: s.avatar_url,
                followers: s.followers,
                following: s.followers,
            },

            images: s.images ?? [],
            videos: s.videos ?? [],
        };

        if (parent_source) {
            tweet['parent_tweet'] = {
                tweet_id: parent_source.tweet_id,
                type: parent_source.type,
                content: parent_source.content,
                created_at: parent_source.created_at,
                likes_count: parent_source.num_likes,
                reposts_count: parent_source.num_reposts,
                views_count: parent_source.num_views,
                replies_count: parent_source.num_replies,
                quotes_count: parent_source.num_quotes,
                user: {
                    id: parent_source.author_id,
                    username: parent_source.username,
                    name: parent_source.name,
                    avatar_url: parent_source.avatar_url,
                    followers: parent_source.followers,
                    following: parent_source.following,
                },
                images: parent_source.images ?? [],
                videos: parent_source.videos ?? [],
            };
        }

        if (conversation_source) {
            tweet['conversation_tweet'] = {
                tweet_id: conversation_source.tweet_id,
                type: conversation_source.type,
                content: conversation_source.content,
                created_at: conversation_source.created_at,
                likes_count: conversation_source.num_likes,
                reposts_count: conversation_source.num_reposts,
                views_count: conversation_source.num_views,
                replies_count: conversation_source.num_replies,
                quotes_count: conversation_source.num_quotes,
                user: {
                    id: conversation_source.author_id,
                    username: conversation_source.username,
                    name: conversation_source.name,
                    avatar_url: conversation_source.avatar_url,
                    followers: conversation_source.followers,
                    following: conversation_source.following,
                },
                images: conversation_source.images ?? [],
                videos: conversation_source.videos ?? [],
            };
        }

        return tweet;
    }

    private encodeCursor(sort: any[] | undefined): string | null {
        if (!sort) return null;
        return Buffer.from(JSON.stringify(sort)).toString('base64');
    }

    private decodeCursor(cursor: string | null): any[] | null {
        if (!cursor) return null;
        try {
            return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
        } catch (error) {
            return null;
        }
    }

    private applyTweetsBoosting(search_body: any): void {
        const boosting_factors = [
            { field: 'num_likes', factor: 0.01 },
            { field: 'num_reposts', factor: 0.02 },
            { field: 'num_quotes', factor: 0.02 },
            { field: 'num_replies', factor: 0.02 },
            { field: 'num_views', factor: 0.001 },
            { field: 'followers', factor: 0.001 },
        ];

        const boost_queries = boosting_factors.map(({ field, factor }) => ({
            function_score: {
                field_value_factor: {
                    field,
                    factor,
                    modifier: 'log1p',
                    missing: 0,
                },
            },
        }));

        search_body.query.bool.should.push(...boost_queries);
    }

    private async attachRelatedTweets(items: any[]): Promise<any[]> {
        const tweets = items.map((hit) => hit._source);

        const { parent_map, conversation_map } = await this.fetchRelatedTweets(tweets);

        return items.map((hit) => {
            const s = hit._source;

            const parent_tweet =
                (s.type === 'reply' || s.type === 'quote') && s.parent_id
                    ? parent_map.get(s.parent_id)
                    : undefined;

            const conversation_tweet =
                s.type === 'reply' && s.conversation_id
                    ? conversation_map.get(s.conversation_id)
                    : undefined;

            return this.mapTweet(hit, parent_tweet, conversation_tweet);
        });
    }

    private async fetchRelatedTweets(tweets: any[]): Promise<{
        parent_map: Map<string, any>;
        conversation_map: Map<string, any>;
    }> {
        const parent_tweet_ids = tweets
            .filter((t) => (t.type === 'reply' || t.type === 'quote') && t.parent_id)
            .map((t) => t.parent_id);

        const conversation_tweet_ids = tweets
            .filter((t) => t.type === 'reply' && t.conversation_id)
            .map((t) => t.conversation_id);

        let parent_map = new Map();
        let conversation_map = new Map();

        if (parent_tweet_ids.length > 0 || conversation_tweet_ids.length > 0) {
            const ids_to_fetch = [...new Set([...parent_tweet_ids, ...conversation_tweet_ids])];

            const fetched_tweets = await this.elasticsearch_service.mget({
                index: ELASTICSEARCH_INDICES.TWEETS,
                body: { ids: ids_to_fetch },
            });

            const tweets_data = new Map(
                fetched_tweets.docs
                    .filter((doc: any) => doc.found === true)
                    .map((doc: any) => [doc._id, doc._source])
            );

            parent_map = new Map(
                parent_tweet_ids
                    .filter((id) => tweets_data.has(id))
                    .map((id) => [id, tweets_data.get(id)])
            );

            conversation_map = new Map(
                conversation_tweet_ids
                    .filter((id) => tweets_data.has(id))
                    .map((id) => [id, tweets_data.get(id)])
            );
        }

        return { parent_map, conversation_map };
    }
}

import { Injectable } from '@nestjs/common';
import { BasicQueryDto } from './dto/basic-query.dto';
import { SearchQueryDto } from './dto/search-query.dto';
import { PostsSearchDto } from './dto/post-search.dto';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { UserListResponseDto } from 'src/user/dto/user-list-response.dto';
import { UserRepository } from 'src/user/user.repository';
import { ELASTICSEARCH_INDICES } from 'src/elasticsearch/schemas';
import { TweetResponseDTO } from 'src/tweets/dto';
import { SortResults } from 'node_modules/@elastic/elasticsearch/lib/api/types';
import { map } from 'rxjs';

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
                following: hit._source.followers,
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
    ): Promise<{
        data: TweetResponseDTO[];
        pagination: {
            next_cursor: string | null;
            has_more: boolean;
        };
    }> {
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

            search_body.query.bool.should.push(
                {
                    function_score: {
                        field_value_factor: {
                            field: 'num_likes',
                            factor: 0.01,
                            modifier: 'log1p',
                            missing: 0,
                        },
                    },
                },
                {
                    function_score: {
                        field_value_factor: {
                            field: 'num_reposts',
                            factor: 0.02,
                            modifier: 'log1p',
                            missing: 0,
                        },
                    },
                },
                {
                    function_score: {
                        field_value_factor: {
                            field: 'num_quotes',
                            factor: 0.02,
                            modifier: 'log1p',
                            missing: 0,
                        },
                    },
                },
                {
                    function_score: {
                        field_value_factor: {
                            field: 'num_replies',
                            factor: 0.02,
                            modifier: 'log1p',
                            missing: 0,
                        },
                    },
                },
                {
                    function_score: {
                        field_value_factor: {
                            field: 'num_views',
                            factor: 0.001,
                            modifier: 'log1p',
                            missing: 0,
                        },
                    },
                },
                {
                    function_score: {
                        field_value_factor: {
                            field: 'followers',
                            factor: 0.001,
                            modifier: 'log1p',
                            missing: 0,
                        },
                    },
                }
            );

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
            const tweets = items.map((hit) => hit._source) as any[];

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

            const mapped_tweets = items.map((hit) => {
                const s = hit._source as any;

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

    async searchLatestPosts(current_user_id: string, query_dto: SearchQueryDto) {}

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
}

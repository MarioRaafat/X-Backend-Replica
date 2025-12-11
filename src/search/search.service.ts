import { Injectable } from '@nestjs/common';
import { BasicQueryDto } from './dto/basic-query.dto';
import { SearchQueryDto } from './dto/search-query.dto';
import { PostsSearchDto } from './dto/post-search.dto';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { UserListResponseDto } from 'src/user/dto/user-list-response.dto';
import { UserRepository } from 'src/user/user.repository';
import { ELASTICSEARCH_INDICES } from 'src/elasticsearch/schemas';
import { TweetListResponseDto } from './dto/tweet-list-response.dto';
import { Brackets, DataSource, SelectQueryBuilder } from 'typeorm';
import { UserListItemDto } from 'src/user/dto/user-list-item.dto';
import { plainToInstance } from 'class-transformer';
import { User } from 'src/user/entities';
import { SuggestionsResponseDto } from './dto/suggestions-response.dto';
import { SuggestedUserDto } from './dto/suggested-user.dto';
import { bool } from 'sharp';
import { TweetResponseDTO } from 'src/tweets/dto';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class SearchService {
    constructor(
        private readonly elasticsearch_service: ElasticsearchService,
        private readonly user_repository: UserRepository,
        private readonly data_source: DataSource,
        private readonly redis_service: RedisService
    ) {}

    async getSuggestions(
        current_user_id: string,
        query_dto: BasicQueryDto
    ): Promise<SuggestionsResponseDto> {
        const { query } = query_dto;

        const sanitized_query = this.validateAndSanitizeQuery(query);

        if (!sanitized_query) {
            return { suggested_queries: [], suggested_users: [] };
        }

        const prefix_query = this.buildUserPrefixQuery(sanitized_query);

        let query_builder = this.user_repository.createQueryBuilder('user');

        query_builder = this.attachUserSearchQuery(query_builder, prefix_query);

        query_builder.setParameters({
            current_user_id,
            prefix_query,
        });

        const trending_hashtags: Map<string, number> = await this.getTrendingHashtags();

        const [users_result, queries_result] = await Promise.all([
            this.executeUsersSearch(query_builder, 10),

            this.elasticsearch_service.search(
                this.buildEsSuggestionsQuery(sanitized_query, trending_hashtags)
            ),
        ]);

        const users_list = users_result.map((user) =>
            plainToInstance(SuggestedUserDto, user, {
                enableImplicitConversion: true,
                excludeExtraneousValues: true,
            })
        );

        const suggestions = this.extractSuggestionsFromHits(
            queries_result.hits.hits,
            query,
            trending_hashtags,
            3
        );

        return {
            suggested_queries: suggestions,
            suggested_users: users_list,
        };
    }

    async searchUsers(
        current_user_id: string,
        query_dto: SearchQueryDto
    ): Promise<UserListResponseDto> {
        const { query, cursor, limit = 20, username } = query_dto;

        const sanitized_query = this.validateAndSanitizeQuery(query);

        if (!sanitized_query) {
            return this.createEmptyResponse();
        }

        const prefix_query = this.buildUserPrefixQuery(sanitized_query);

        const cursor_data = cursor ? this.decodeUsersCursor(cursor) : null;

        const cursor_score = cursor_data?.score;
        const cursor_id = cursor_data?.user_id;

        const fetch_limit = limit + 1;

        let query_builder = this.user_repository.createQueryBuilder('user');

        query_builder = this.attachUserSearchQuery(query_builder, prefix_query);

        if (username) {
            query_builder = this.attachUsersUsernameFilter(query_builder);
        }

        if (cursor && cursor_score && cursor_id) {
            this.applyUserCursorPagination(query_builder, cursor_score, cursor_id);
        }

        query_builder.setParameters({
            current_user_id,
            prefix_query,
            username,
        });

        const results = await this.executeUsersSearch(query_builder, fetch_limit);

        const { users, has_more, next_cursor } = this.processUserPaginationResults(results, limit);

        const users_list = users.map((user) =>
            plainToInstance(UserListItemDto, user, {
                enableImplicitConversion: true,
                excludeExtraneousValues: true,
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

    async searchPosts(
        current_user_id: string,
        query_dto: PostsSearchDto
    ): Promise<TweetListResponseDto> {
        const { query, cursor, limit = 20, has_media, username } = query_dto;

        const sanitized_query = this.validateAndSanitizeQuery(query);

        if (!sanitized_query) {
            return this.createEmptyResponse();
        }

        try {
            const search_body: any = this.buildBaseSearchBody('relevance', limit, cursor);

            const { hashtags, remaining_text } = this.extractHashtagsAndText(sanitized_query);

            this.addHashtagFilters(search_body, hashtags);

            if (remaining_text.length > 0) {
                this.buildTweetsSearchQuery(search_body, remaining_text);
            }

            const trending_hashtags: Map<string, number> = await this.getTrendingHashtags();

            this.applyTweetsBoosting(search_body, trending_hashtags);

            if (has_media) {
                this.addMediaFilter(search_body);
            }

            if (username) {
                this.addTweetsUsernameFilter(search_body, username);
            }

            return await this.executeTweetsSearch(search_body, current_user_id);
        } catch (error) {
            console.log(error);
            return this.createEmptyResponse();
        }
    }

    async searchLatestPosts(
        current_user_id: string,
        query_dto: SearchQueryDto
    ): Promise<TweetListResponseDto> {
        const { query, cursor, limit = 20, username } = query_dto;

        const sanitized_query = this.validateAndSanitizeQuery(query);

        if (!sanitized_query) {
            return this.createEmptyResponse();
        }

        try {
            const search_body: any = this.buildBaseSearchBody('recency', limit, cursor);

            const { hashtags, remaining_text } = this.extractHashtagsAndText(sanitized_query);

            this.addHashtagFilters(search_body, hashtags);

            if (remaining_text.length > 0) {
                this.buildTweetsSearchQuery(search_body, remaining_text);
            }

            const trending_hashtags: Map<string, number> = await this.getTrendingHashtags();

            this.applyTweetsBoosting(search_body, trending_hashtags);

            if (username) {
                this.addTweetsUsernameFilter(search_body, username);
            }

            return await this.executeTweetsSearch(search_body, current_user_id);
        } catch (error) {
            console.log(error);
            return this.createEmptyResponse();
        }
    }

    async getMentionSuggestions(
        current_user_id: string,
        query_dto: BasicQueryDto
    ): Promise<SuggestedUserDto[]> {
        const { query } = query_dto;

        const sanitized_query = this.validateAndSanitizeQuery(query);

        if (!sanitized_query) {
            return [];
        }

        const prefix_query = this.buildUserPrefixQuery(sanitized_query);

        let query_builder = this.user_repository.createQueryBuilder('user');

        query_builder = this.attachUserSearchQuery(query_builder, prefix_query);

        query_builder.setParameters({
            current_user_id,
            prefix_query,
        });

        const users_result = await this.executeUsersSearch(query_builder, 10);

        const users_list = users_result.map((user) =>
            plainToInstance(SuggestedUserDto, user, {
                enableImplicitConversion: true,
                excludeExtraneousValues: true,
            })
        );

        return users_list;
    }

    private validateAndSanitizeQuery(query: string): string | null {
        const decoded_query = decodeURIComponent(query);
        const sanitized_query = decoded_query.replace(/[^\p{L}\p{N}\s#]/gu, '');

        if (!sanitized_query || sanitized_query.trim().length === 0) {
            return null;
        }

        return sanitized_query;
    }

    private createEmptyResponse(): {
        data: [];
        pagination: { next_cursor: string | null; has_more: boolean };
    } {
        return {
            data: [],
            pagination: {
                next_cursor: null,
                has_more: false,
            },
        };
    }

    private buildBaseSearchBody(
        type: 'relevance' | 'recency',
        limit: number,
        cursor?: string | null
    ): any {
        const search_body: any = {
            query: {
                bool: {
                    must: [],
                    should: [],
                },
            },
            size: limit + 1,
            sort:
                type === 'relevance'
                    ? [
                          { _score: { order: 'desc' } },
                          { created_at: { order: 'desc' } },
                          { tweet_id: { order: 'desc' } },
                      ]
                    : [
                          { created_at: { order: 'desc' } },
                          { _score: { order: 'desc' } },
                          { tweet_id: { order: 'desc' } },
                      ],
        };

        if (cursor) {
            search_body.search_after = this.decodeTweetsCursor(cursor);
        }

        return search_body;
    }

    private async executeTweetsSearch(
        search_body: any,
        current_user_id: string
    ): Promise<TweetListResponseDto> {
        const result = await this.elasticsearch_service.search({
            index: ELASTICSEARCH_INDICES.TWEETS,
            body: search_body,
        });

        const limit = search_body.size - 1;

        const hits = result.hits.hits;

        const has_more = hits.length > limit;
        const items = has_more ? hits.slice(0, limit) : hits;

        let next_cursor: string | null = null;

        if (has_more) {
            const last_hit = hits[limit - 1];
            next_cursor = this.encodeTweetsCursor(last_hit.sort) ?? null;
        }

        const mapped_tweets = await this.attachRelatedTweets(items);
        const tweets_with_interactions = await this.attachUserInteractions(
            mapped_tweets,
            current_user_id
        );

        return {
            data: tweets_with_interactions,
            pagination: {
                next_cursor,
                has_more,
            },
        };
    }

    private mapTweet(hit: any, parent_source?: any, conversation_source?: any): TweetResponseDTO {
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
                following: s.following,
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

    private encodeTweetsCursor(sort: any[] | undefined): string | null {
        if (!sort) return null;
        return Buffer.from(JSON.stringify(sort)).toString('base64');
    }

    private decodeTweetsCursor(cursor: string | null): any[] | null {
        if (!cursor) return null;
        try {
            return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
        } catch (error) {
            return null;
        }
    }

    private buildTweetsSearchQuery(search_body: any, sanitized_query: string): void {
        search_body.query.bool.should.push(
            {
                multi_match: {
                    query: sanitized_query.trim(),
                    fields: ['content^3', 'content.arabic^3', 'username^2', 'name', 'name.arabic'],
                    type: 'best_fields',
                    fuzziness: 'AUTO',
                    prefix_length: 1,
                    operator: 'or',
                    boost: 10,
                },
            },
            {
                match_phrase: {
                    content: {
                        query: sanitized_query.trim(),
                        boost: 5,
                    },
                },
            },
            {
                match_phrase: {
                    'content.arabic': {
                        query: sanitized_query.trim(),
                        boost: 5,
                    },
                },
            },
            {
                match: {
                    'content.autocomplete': {
                        query: sanitized_query.trim(),
                        boost: 2,
                    },
                },
            },
            {
                match: {
                    'name.autocomplete': {
                        query: sanitized_query.trim(),
                        boost: 1,
                    },
                },
            }
        );
    }

    private extractHashtagsAndText(sanitized_query: string): {
        hashtags: string[];
        remaining_text: string;
    } {
        const hashtag_pattern = /#[\p{L}\p{N}_]+/gu;
        const hashtags = sanitized_query.match(hashtag_pattern) || [];
        const remaining_text = sanitized_query.replace(hashtag_pattern, '').trim();

        return { hashtags, remaining_text };
    }

    private addHashtagFilters(search_body: any, hashtags: string[]): void {
        if (hashtags.length > 0) {
            hashtags.forEach((hashtag) => {
                search_body.query.bool.must.push({
                    term: {
                        hashtags: {
                            value: hashtag.toLowerCase(),
                            boost: 10,
                        },
                    },
                });
            });
        }
    }

    private addMediaFilter(search_body: any): void {
        search_body.query.function_score.query.bool.filter =
            search_body.query.function_score.query.bool.filter || [];
        search_body.query.function_score.query.bool.filter.push({
            script: {
                script: {
                    source: "(doc['images'].size() > 0 || doc['videos'].size() > 0)",
                },
            },
        });
    }

    private addTweetsUsernameFilter(search_body: any, username: string): void {
        search_body.query.function_score.query.bool.filter =
            search_body.query.function_score.query.bool.filter || [];
        search_body.query.function_score.query.bool.filter.push({
            term: {
                username,
            },
        });
    }

    private applyTweetsBoosting(search_body: any, trending_hashtags?: Map<string, number>): void {
        const boosting_factors = [
            { field: 'num_likes', factor: 2 },
            { field: 'num_reposts', factor: 2.5 },
            { field: 'num_quotes', factor: 2.2 },
            { field: 'num_replies', factor: 1.5 },
            { field: 'num_views', factor: 0.1 },
            { field: 'followers', factor: 1 },
        ];

        const functions: any[] = [
            ...boosting_factors.map(({ field, factor }) => ({
                field_value_factor: {
                    field,
                    factor,
                    modifier: 'log1p',
                    missing: 0,
                },
            })),
        ];

        if (trending_hashtags && trending_hashtags.size > 0) {
            const max_score = Math.max(...Array.from(trending_hashtags.values()), 1);

            const trending_functions = Array.from(trending_hashtags.entries()).map(
                ([hashtag, score]) => ({
                    filter: {
                        term: {
                            hashtags: { value: hashtag },
                        },
                    },
                    weight: 10 + (score / max_score) * 10,
                })
            );

            functions.push(...trending_functions);
        }

        const original_query = { ...search_body.query };

        search_body.query = {
            function_score: {
                query: original_query,
                functions,
                score_mode: 'sum',
                boost_mode: 'sum',
            },
        };
    }

    private async attachRelatedTweets(items: any[]): Promise<TweetResponseDTO[]> {
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

    private async attachUserInteractions(
        tweets: TweetResponseDTO[],
        current_user_id: string
    ): Promise<TweetResponseDTO[]> {
        if (!tweets.length) {
            return tweets;
        }

        const tweet_values = tweets
            .map((_, idx) => `($${idx * 2 + 1}::uuid, $${idx * 2 + 2}::uuid)`)
            .join(', ');

        const tweet_params_count = tweets.length * 2;
        const liked_param = `$${tweet_params_count + 1}`;
        const reposted_param = `$${tweet_params_count + 2}`;
        const bookmarked_param = `$${tweet_params_count + 3}`;
        const following_param = `$${tweet_params_count + 4}`;
        const follower_param = `$${tweet_params_count + 5}`;
        const blocked_param = `$${tweet_params_count + 6}`;
        const muted_param = `$${tweet_params_count + 7}`;

        const query = `
        SELECT 
            t.tweet_id,
            t.user_id,
            (EXISTS(
                SELECT 1 FROM tweet_likes 
                WHERE tweet_id = t.tweet_id 
                AND user_id = ${liked_param}::uuid
            ))::int as is_liked,
            (EXISTS(
                SELECT 1 FROM tweet_reposts 
                WHERE tweet_id = t.tweet_id 
                AND user_id = ${reposted_param}::uuid
            ))::int as is_reposted,
            (EXISTS(
                SELECT 1 FROM tweet_bookmarks 
                WHERE tweet_id = t.tweet_id 
                AND user_id = ${bookmarked_param}::uuid
            ))::int as is_bookmarked,
            (EXISTS(
                SELECT 1 FROM user_follows 
                WHERE followed_id = t.user_id 
                AND follower_id = ${following_param}::uuid
            ))::int as is_following,
            (EXISTS(
                SELECT 1 FROM user_follows 
                WHERE follower_id = t.user_id 
                AND followed_id = ${follower_param}::uuid
            ))::int as is_follower
        FROM (VALUES ${tweet_values}) AS t(tweet_id, user_id)
        WHERE NOT EXISTS(
            SELECT 1 FROM user_blocks 
            WHERE blocker_id = ${blocked_param}::uuid 
            AND blocked_id = t.user_id
        )
        AND NOT EXISTS(
            SELECT 1 FROM user_mutes 
            WHERE muter_id = ${muted_param}::uuid 
            AND muted_id = t.user_id
        )
        `;

        const tweet_params = tweets.flatMap((t) => [t.tweet_id, t.user?.id]);
        const params = [
            ...tweet_params,
            current_user_id,
            current_user_id,
            current_user_id,
            current_user_id,
            current_user_id,
            current_user_id,
            current_user_id,
        ];

        interface IInteractionResult {
            tweet_id: string;
            user_id: string;
            is_liked: number;
            is_reposted: number;
            is_bookmarked: number;
            is_following: number;
            is_follower: number;
        }

        const interactions: IInteractionResult[] = await this.data_source.query(query, params);

        const interactions_map = new Map(
            interactions.map((i: any) => [
                i.tweet_id,
                {
                    is_liked: Boolean(i.is_liked),
                    is_reposted: Boolean(i.is_reposted),
                    is_bookmarked: Boolean(i.is_bookmarked),
                    is_following: Boolean(i.is_following),
                    is_follower: Boolean(i.is_follower),
                },
            ])
        );

        const filtered_tweets = tweets.filter((tweet) => interactions_map.has(tweet.tweet_id));

        return filtered_tweets.map((tweet) => {
            const interaction = interactions_map.get(tweet.tweet_id);

            return {
                ...tweet,
                is_liked: interaction?.is_liked ?? false,
                is_reposted: interaction?.is_reposted ?? false,
                is_bookmarked: interaction?.is_bookmarked ?? false,
                user: {
                    ...tweet.user,
                    is_following: interaction?.is_following ?? false,
                    is_follower: interaction?.is_follower ?? false,
                },
            };
        });
    }

    private buildUserPrefixQuery(sanitized_query: string): string {
        return sanitized_query
            .split(/\s+/)
            .filter(Boolean)
            .map((term) => `${term}:*`)
            .join(' & ');
    }

    private attachUserSearchQuery(
        query_builder: SelectQueryBuilder<User>,
        prefix_query: string
    ): SelectQueryBuilder<User> {
        query_builder
            .select([
                '"user".id AS user_id',
                '"user".name AS name',
                '"user".username AS username',
                '"user".bio AS bio',
                '"user".avatar_url AS avatar_url',
                '"user".cover_url AS cover_url',
                '"user".verified AS verified',
                '"user".followers AS followers',
                '"user".following AS following',
            ])
            .leftJoin(
                (qb) => {
                    return qb
                        .select('followed_id', 'followed_id')
                        .addSelect('1000000', 'boost')
                        .from('user_follows', 'uf')
                        .where('uf.follower_id = :current_user_id');
                },
                'uf_following',
                '"uf_following".followed_id = "user".id'
            )
            .leftJoin(
                (qb) => {
                    return qb
                        .select('follower_id', 'follower_id')
                        .addSelect('TRUE', 'is_follower')
                        .from('user_follows', 'uf')
                        .where('uf.followed_id = :current_user_id');
                },
                'uf_follower',
                '"uf_follower".follower_id = "user".id'
            )
            .addSelect(
                'CASE WHEN uf_following.followed_id IS NOT NULL THEN TRUE ELSE FALSE END',
                'is_following'
            )
            .addSelect(
                'CASE WHEN uf_follower.follower_id IS NOT NULL THEN TRUE ELSE FALSE END',
                'is_follower'
            )
            .addSelect(this.getUserScoreExpression(), 'total_score')
            .where(`"user".search_vector @@ to_tsquery('simple', :prefix_query)`, { prefix_query })
            .andWhere(`NOT EXISTS (
                SELECT 1 FROM user_blocks 
                WHERE blocker_id = :current_user_id 
                AND blocked_id = "user".id
            )`);

        return query_builder;
    }

    private getUserScoreExpression(): string {
        return `
        (COALESCE(uf_following.boost, 0))
        +
        (ts_rank("user".search_vector, to_tsquery('simple', :prefix_query)) * 1000)
        +
        (LOG(GREATEST("user".followers, 1) + 1) * 100)
        `;
    }

    private decodeUsersCursor(cursor: string): { score: number; user_id: string } {
        try {
            const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
            return {
                score: decoded.score,
                user_id: decoded.user_id,
            };
        } catch (error) {
            throw new Error('Invalid cursor');
        }
    }

    private encodeUsersCursor(score: number, user_id: string): string {
        const cursor_data = { score, user_id };
        return Buffer.from(JSON.stringify(cursor_data)).toString('base64');
    }

    private async executeUsersSearch(
        query_builder: SelectQueryBuilder<User>,
        fetch_limit: number
    ): Promise<any[]> {
        return await query_builder
            .orderBy('total_score', 'DESC')
            .addOrderBy('user.id', 'ASC')
            .limit(fetch_limit)
            .getRawMany();
    }

    private processUserPaginationResults(
        results: any[],
        limit: number
    ): {
        users: any[];
        has_more: boolean;
        next_cursor: string | null;
    } {
        const has_more = results.length > limit;
        const users = has_more ? results.slice(0, limit) : results;

        let next_cursor: string | null = null;
        if (has_more && users.length > 0) {
            const last_user = users[users.length - 1];
            next_cursor = this.encodeUsersCursor(last_user.total_score, last_user.user_id);
        }

        return { users, has_more, next_cursor };
    }

    private applyUserCursorPagination(
        query_builder: SelectQueryBuilder<User>,
        cursor_score: number,
        cursor_id: string
    ): void {
        query_builder.andWhere(
            new Brackets((qb) => {
                qb.where(`${this.getUserScoreExpression()} < :cursor_score`, {
                    cursor_score,
                }).orWhere(
                    new Brackets((qb2) => {
                        qb2.where(`${this.getUserScoreExpression()} = :cursor_score`, {
                            cursor_score,
                        }).andWhere('"user".id > :cursor_id', { cursor_id });
                    })
                );
            })
        );
    }

    private attachUsersUsernameFilter(
        query_builder: SelectQueryBuilder<User>
    ): SelectQueryBuilder<User> {
        query_builder.andWhere(`EXISTS (
                    SELECT 1 FROM "user" target_user
                    WHERE target_user.username = :username
                    AND (
                        EXISTS (
                            SELECT 1 FROM user_follows uf1
                            WHERE uf1.follower_id = "user".id 
                            AND uf1.followed_id = target_user.id
                        )
                        OR
                        EXISTS (
                            SELECT 1 FROM user_follows uf2
                            WHERE uf2.followed_id = "user".id 
                            AND uf2.follower_id = target_user.id
                        )
                    )
                )`);

        return query_builder;
    }

    private buildEsSuggestionsQuery(
        sanitized_query: string,
        trending_hashtags: Map<string, number>
    ) {
        const is_hashtag = sanitized_query.startsWith('#');

        const search_body = {
            index: 'tweets',
            size: 20,
            _source: ['content'],
            query: {
                bool: {
                    should: [
                        {
                            prefix: {
                                hashtags: {
                                    value: is_hashtag
                                        ? sanitized_query.toLowerCase()
                                        : `#${sanitized_query.toLowerCase()}`,
                                    boost: 3,
                                },
                            },
                        },

                        ...(is_hashtag
                            ? []
                            : [
                                  {
                                      match_phrase_prefix: {
                                          content: {
                                              query: sanitized_query,
                                              slop: 0,
                                              boost: 2,
                                          },
                                      },
                                  },
                              ]),
                    ],
                    minimum_should_match: 1,
                },
            },
            highlight: {
                fields: {
                    content: {
                        type: 'plain',
                        fragment_size: 150,
                        number_of_fragments: 1,
                        pre_tags: ['<MARK>'],
                        post_tags: ['</MARK>'],
                    },
                },
            },
        };

        this.applyTweetsBoosting(search_body, trending_hashtags);

        return search_body;
    }

    private extractSuggestionsFromHits(
        hits: any[],
        query: string,
        trending_hashtags: Map<string, number>,
        max_suggestions = 3
    ): Array<{ query: string; is_trending: boolean }> {
        const suggestions = new Map<string, boolean>();
        const query_lower = query.toLowerCase().trim();
        const is_hashtag_query = query_lower.startsWith('#');

        hits.forEach((hit) => {
            let text = hit.highlight?.content?.[0] || hit._source?.content;
            if (!text) return;

            const text_with_marks = text;
            text = text.replace(/<\/?MARK>/g, '');

            const lower_text = text.toLowerCase();

            const mark_index = text_with_marks.indexOf('<MARK>');
            let query_index: number;
            let is_hashtag = is_hashtag_query;

            if (mark_index !== -1) {
                const before_mark = text_with_marks.substring(0, mark_index);
                const has_hash_before_mark = before_mark.endsWith('#');

                if (has_hash_before_mark && !is_hashtag_query) {
                    is_hashtag = true;
                    const actual_position = before_mark.replace(/<\/?MARK>/g, '').length;
                    query_index = actual_position - 1;
                } else {
                    query_index = lower_text.indexOf(query_lower);
                }
            } else {
                query_index = lower_text.indexOf(query_lower);
            }

            if (query_index === -1) return;

            const from_query = text.substring(query_index);

            let completion: string;
            let is_trending = false;

            if (is_hashtag) {
                const hashtag_match = from_query.match(/^#\w+/);
                if (!hashtag_match) return;
                completion = hashtag_match[0];

                is_trending = trending_hashtags.has(completion.toLowerCase());
            } else {
                const sentence_end_match = from_query.match(/[.!?\n]/);
                const end_index = sentence_end_match
                    ? sentence_end_match.index
                    : Math.min(from_query.length, 100);
                completion = from_query.substring(0, end_index).trim();

                completion = completion.replace(/[,;:]+$/, '').trim();

                if (completion.length < query.length + 3) return;
                if (completion.length > 100) return;
                if (!completion.toLowerCase().startsWith(query_lower)) return;
                const middle_content = completion.substring(0, completion.length - 1);
                if (/[.!?]/.test(middle_content)) return;
            }
            suggestions.set(completion, is_trending);
        });

        return Array.from(suggestions.entries())
            .sort((a, b) => {
                if (a[1] !== b[1]) return a[1] ? -1 : 1;
                return a[0].length - b[0].length;
            })
            .slice(0, max_suggestions)
            .map(([query, is_trending]) => ({ query, is_trending }));
    }

    private async getTrendingHashtags(): Promise<Map<string, number>> {
        try {
            const result = await this.redis_service.zrevrange(
                'trending:global',
                0,
                29,
                'WITHSCORES'
            );

            if (!result || result.length === 0) return new Map();

            const trending_map = new Map<string, number>();

            for (let i = 0; i < result.length; i += 2) {
                const hashtag = result[i];
                const score = parseFloat(result[i + 1]);

                const normalized = hashtag.toLowerCase().startsWith('#')
                    ? hashtag.toLowerCase()
                    : `#${hashtag.toLowerCase()}`;

                trending_map.set(normalized, score);
            }

            return trending_map;
        } catch (error) {
            console.error('Error fetching trending hashtags:', error);
            return new Map();
        }
    }
}

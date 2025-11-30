import { Injectable } from '@nestjs/common';
import { BasicQueryDto } from './dto/basic-query.dto';
import { SearchQueryDto } from './dto/search-query.dto';
import { PostsSearchDto } from './dto/post-search.dto';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { UserListResponseDto } from 'src/user/dto/user-list-response.dto';
import { UserRepository } from 'src/user/user.repository';
import { ELASTICSEARCH_INDICES } from 'src/elasticsearch/schemas';

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
            const from = 0;
            const size = 10;

            const search_body: any = {
                query: {
                    bool: {
                        must: [],
                        filter: [],
                    },
                },
                from,
                size,
                sort: [{ _score: { order: 'desc' } }, { follower_count: { order: 'desc' } }],
            };

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

            if (location) {
                const user = await this.user_repository.findById(current_user_id);
                if (user) {
                    search_body.query.bool.filter.push({
                        term: { country: user.country },
                    });
                }
            }

            const result = await this.elasticsearch_service.search({
                index: 'users',
                body: search_body,
            });

            const users = result.hits.hits.map((hit: any) => ({
                user_id: hit._source.user_id,
                username: hit._source.username,
                name: hit._source.name,
                bio: hit._source.bio,
                country: hit._source.country,
                followers: hit._source.followers,
                following: hit._source.followers,
                verified: hit._source.verified,
                avatar_url: hit._source.avatar_url,
                score: hit._score,
            }));

            console.log(users);

            return {
                data: users,
                pagination: {
                    next_cursor: 'blah',
                    has_more: users.length === 6,
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

    async searchPosts(current_user_id: string, query_dto: PostsSearchDto) {
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

        console.log(hits);
    }

    async searchLatestPosts(current_user_id: string, query_dto: SearchQueryDto) {}
}

import { Injectable } from '@nestjs/common';
import { BasicQueryDto } from './dto/basic-query.dto';
import { SearchQueryDto } from './dto/search-query.dto';
import { PostsSearchDto } from './dto/post-search.dto';
import { ElasticsearchService } from '@nestjs/elasticsearch';

@Injectable()
export class SearchService {
    constructor(private readonly elasticsearch_service: ElasticsearchService) {}

    async getSuggestions(query_dto: BasicQueryDto) {}

    async searchUsers(query_dto: SearchQueryDto) {}

    async searchPosts(query_dto: PostsSearchDto) {}

    async searchLatestPosts(query_dto: SearchQueryDto) {}
}

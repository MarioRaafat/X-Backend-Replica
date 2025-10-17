import { Injectable } from '@nestjs/common';
import { BasicQueryDto } from './dto/basic-query.dto';
import { SearchQueryDto } from './dto/search-query.dto';
import { PostsSearchDto } from './dto/post-search.dto';

@Injectable()
export class SearchService {
  async getSuggestions(queryDto: BasicQueryDto) {}

  async searchUsers(query: SearchQueryDto) {}

  async searchPosts(query: PostsSearchDto) {}

  async searchLatestPosts(query: SearchQueryDto) {}
}

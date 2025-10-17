import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { ApiBadRequestErrorResponse } from 'src/decorators/swagger-error-responses.decorator';
import { ResponseMessage } from 'src/decorators/response-message.decorator';
import {
  get_suggestions_swagger,
  search_latest_posts,
  search_users_swagger,
} from './search.swagger';
import {
  SUCCESS_MESSAGES,
  ERROR_MESSAGES,
} from 'src/constants/swagger-messages';
import { BasicQueryDto } from './dto/basic-query.dto';
import { PostsSearchDto } from './dto/post-search.dto';
import { SearchQueryDto } from './dto/search-query.dto';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @ApiOperation(get_suggestions_swagger.operation)
  @ApiOkResponse(get_suggestions_swagger.responses.success)
  @ApiBadRequestErrorResponse(ERROR_MESSAGES.INVALID_SEARCH_QUERY)
  @ResponseMessage(SUCCESS_MESSAGES.SUGGESTIONS_RETRIEVED)
  @Get('suggestions')
  async getSuggestions(@Query() query_dto: BasicQueryDto) {
    return await this.searchService.getSuggestions(query_dto);
  }

  @ApiOperation(search_users_swagger.operation)
  @ApiOkResponse(search_users_swagger.responses.success)
  @ApiBadRequestErrorResponse(ERROR_MESSAGES.INVALID_SEARCH_QUERY)
  @ResponseMessage(SUCCESS_MESSAGES.SEARCH_USERS_RETRIEVED)
  @Get('users')
  async searchPeople(@Query() query_dto: SearchQueryDto) {
    return await this.searchService.searchUsers(query_dto);
  }

  @ApiOperation(search_latest_posts.operation)
  @ApiOkResponse(search_latest_posts.responses.success)
  @ApiBadRequestErrorResponse(ERROR_MESSAGES.INVALID_SEARCH_QUERY)
  @ResponseMessage(SUCCESS_MESSAGES.SEARCH_LATEST_POSTS_RETRIEVED)
  @Get('posts')
  async searchPosts(@Query() query_dto: PostsSearchDto) {
    return await this.searchService.searchPosts(query_dto);
  }

  @ApiOperation(search_latest_posts.operation)
  @ApiOkResponse(search_latest_posts.responses.success)
  @ApiBadRequestErrorResponse(ERROR_MESSAGES.INVALID_SEARCH_QUERY)
  @ResponseMessage(SUCCESS_MESSAGES.SEARCH_LATEST_POSTS_RETRIEVED)
  @Get('posts/latest')
  async searchLatestPosts(@Query() query_dto: SearchQueryDto) {
    return await this.searchService.searchLatestPosts(query_dto);
  }
}

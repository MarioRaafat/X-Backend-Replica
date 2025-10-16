import {
  Controller,
  Get,
  Query,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { SearchService } from './search.service';
import { CreateSearchHistoryQueryDto } from './dto/create-search-history-query.dto';
import { CreateSearchHistoryPeopleDto } from './dto/create-search-history-people.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiCookieAuth,
  ApiQuery,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import {
  ApiBadRequestErrorResponse,
  ApiUnauthorizedErrorResponse,
  ApiForbiddenErrorResponse,
  ApiNotFoundErrorResponse,
  ApiConflictErrorResponse,
  ApiUnprocessableEntityErrorResponse,
  ApiInternalServerError,
} from 'src/decorators/swagger-error-responses.decorator';
import { ResponseMessage } from 'src/decorators/response-message.decorator';
import {
  get_suggestions_swagger,
  get_history_swagger,
  delete_history_swagger,
  delete_history_item_swagger,
  create_history_query_swagger,
  create_history_people_swagger,
  search_latest_posts,
  search_users_swagger,
} from './search.swagger';
import {
  SUCCESS_MESSAGES,
  ERROR_MESSAGES,
} from 'src/constants/swagger-messages';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { SearchPostsDto } from './dto/search-posts.dto';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation(get_suggestions_swagger.operation)
  @ApiQuery(get_suggestions_swagger.api_query)
  @ApiOkResponse(get_suggestions_swagger.responses.success)
  @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
  @ApiBadRequestErrorResponse(ERROR_MESSAGES.INVALID_SEARCH_QUERY)
  @ResponseMessage(SUCCESS_MESSAGES.SUGGESTIONS_RETRIEVED)
  @Get('suggestions')
  async getSuggestions(@Query('query') query: string) {
    return await this.searchService.getSuggestions(query);
  }


  @ApiOperation(get_history_swagger.operation)
  @ApiOkResponse(get_history_swagger.responses.success)
  @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
  @ResponseMessage(SUCCESS_MESSAGES.SEARCH_HISTORY_RETRIEVED)
  @Get('history')
  async getSearchHistory() {
    return await this.searchService.getSearchHistory();
  }

  @ApiOperation(delete_history_swagger.operation)
  @ApiOkResponse(delete_history_swagger.responses.success)
  @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
  @ResponseMessage(SUCCESS_MESSAGES.SEARCH_HISTORY_CLEARED)
  @Delete('history')
  async deleteAllSearchHistory() {
    return await this.searchService.deleteAllSearchHistory();
  }

  @ApiOperation(delete_history_item_swagger.operation)
  @ApiOkResponse(delete_history_item_swagger.responses.success)
  @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
  @ApiParam({ name: 'id', required: true })
  @Delete('history/:id')
  @ResponseMessage(SUCCESS_MESSAGES.SEARCH_HISTORY_ITEM_DELETED)
  async deleteSearchHistoryById(@Param('id') id: string) {
    return await this.searchService.deleteSearchHistoryById(id);
  }

  @ApiOperation(create_history_query_swagger.operation)
  @ApiCreatedResponse(create_history_query_swagger.responses.success)
  @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
  @ApiBody({ type: CreateSearchHistoryQueryDto })
  @Post('history/query')
  @ResponseMessage(SUCCESS_MESSAGES.SEARCH_HISTORY_QUERY_SAVED)
  async createSearchHistoryQuery(@Body() body: CreateSearchHistoryQueryDto) {
    return await this.searchService.createSearchHistoryQuery(body);
  }

  @ApiOperation(create_history_people_swagger.operation)
  @ApiCreatedResponse(create_history_people_swagger.responses.success)
  @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
  @ApiBody({ type: CreateSearchHistoryPeopleDto })
  @Post('history/people')
  @ResponseMessage(SUCCESS_MESSAGES.SEARCH_HISTORY_PEOPLE_SAVED)
  async createSearchHistoryPeople(@Body() body: CreateSearchHistoryPeopleDto) {
    return await this.searchService.createSearchHistoryPeople(body);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation(search_users_swagger.operation)
  @ApiQuery(search_users_swagger.api_query)
  @ApiOkResponse(search_users_swagger.responses.success)
  @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
  @ApiBadRequestErrorResponse(ERROR_MESSAGES.INVALID_SEARCH_QUERY)
  @ResponseMessage(SUCCESS_MESSAGES.SEARCH_USERS_RETRIEVED)
  @Get('users')
  async searchPeople(@Query('query') query: string) {
    return await this.searchService.searchUsers(query);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation(search_latest_posts.operation)
  @ApiOkResponse(search_latest_posts.responses.success)
  @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
  @ApiBadRequestErrorResponse(ERROR_MESSAGES.INVALID_SEARCH_QUERY)
  @ResponseMessage(SUCCESS_MESSAGES.SEARCH_LATEST_POSTS_RETRIEVED)
  @Get('posts')
  async searchPosts(@Query('query') queryDto: SearchPostsDto) {
    return await this.searchService.searchPosts(queryDto.query);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation(search_latest_posts.operation)
  @ApiQuery(search_latest_posts.api_query)
  @ApiOkResponse(search_latest_posts.responses.success)
  @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
  @ApiBadRequestErrorResponse(ERROR_MESSAGES.INVALID_SEARCH_QUERY)
  @ResponseMessage(SUCCESS_MESSAGES.SEARCH_LATEST_POSTS_RETRIEVED)
  @Get('posts/latest')
  async searchLatestPosts(@Query('query') query: string) {
    return await this.searchService.searchLatestPosts(query);
  }
}

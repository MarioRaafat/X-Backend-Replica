import { Controller, Get, Query, Post, Delete, Param, Body } from '@nestjs/common';
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
} from './search.swagger';
import {
  SUCCESS_MESSAGES,
  ERROR_MESSAGES,
} from 'src/constants/swagger-messages';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @ApiOperation(get_suggestions_swagger.operation)
  @ApiOkResponse(get_suggestions_swagger.responses.success)
  @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
  @ApiBadRequestErrorResponse(ERROR_MESSAGES.ACCOUNT_ALREADY_VERIFIED)
  @ResponseMessage(SUCCESS_MESSAGES.ACCOUNT_REMOVED)
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
}

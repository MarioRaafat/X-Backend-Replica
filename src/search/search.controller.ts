import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';
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
import { get_suggestions_swagger } from './search.swagger';
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
}

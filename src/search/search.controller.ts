import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SearchService } from './search.service';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiBadRequestErrorResponse } from 'src/decorators/swagger-error-responses.decorator';
import { ResponseMessage } from 'src/decorators/response-message.decorator';
import {
    get_suggestions_swagger,
    search_latest_posts,
    search_users_swagger,
} from './search.swagger';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from 'src/constants/swagger-messages';
import { BasicQueryDto } from './dto/basic-query.dto';
import { PostsSearchDto } from './dto/post-search.dto';
import { SearchQueryDto } from './dto/search-query.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { GetUserId } from 'src/decorators/get-userId.decorator';

@ApiTags('Search')
@Controller('search')
export class SearchController {
    constructor(private readonly search_service: SearchService) {}

    @UseGuards(JwtAuthGuard)
    @ApiOperation(get_suggestions_swagger.operation)
    @ApiOkResponse(get_suggestions_swagger.responses.success)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.INVALID_SEARCH_QUERY)
    @ResponseMessage(SUCCESS_MESSAGES.SUGGESTIONS_RETRIEVED)
    @Get('suggestions')
    async getSuggestions(@GetUserId() current_user_id: string, @Query() query_dto: BasicQueryDto) {
        return await this.search_service.getSuggestions(current_user_id, query_dto);
    }

    @UseGuards(JwtAuthGuard)
    @ApiOperation(search_users_swagger.operation)
    @ApiOkResponse(search_users_swagger.responses.success)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.INVALID_SEARCH_QUERY)
    @ResponseMessage(SUCCESS_MESSAGES.SEARCH_USERS_RETRIEVED)
    @Get('users')
    async searchPeople(@GetUserId() current_user_id: string, @Query() query_dto: SearchQueryDto) {
        return await this.search_service.searchUsers(current_user_id, query_dto);
    }

    @UseGuards(JwtAuthGuard)
    @ApiOperation(search_latest_posts.operation)
    @ApiOkResponse(search_latest_posts.responses.success)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.INVALID_SEARCH_QUERY)
    @ResponseMessage(SUCCESS_MESSAGES.SEARCH_POSTS_RETRIEVED)
    @Get('posts')
    async searchPosts(@GetUserId() current_user_id: string, @Query() query_dto: PostsSearchDto) {
        return await this.search_service.searchPosts(current_user_id, query_dto);
    }

    @UseGuards(JwtAuthGuard)
    @ApiOperation(search_latest_posts.operation)
    @ApiOkResponse(search_latest_posts.responses.success)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.INVALID_SEARCH_QUERY)
    @ResponseMessage(SUCCESS_MESSAGES.SEARCH_LATEST_POSTS_RETRIEVED)
    @Get('posts/latest')
    async searchLatestPosts(
        @GetUserId() current_user_id: string,
        @Query() query_dto: SearchQueryDto
    ) {
        return await this.search_service.searchLatestPosts(current_user_id, query_dto);
    }
}

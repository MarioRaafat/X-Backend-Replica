import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags, ApiParam } from '@nestjs/swagger';
import {
    ApiBadRequestErrorResponse,
    ApiInternalServerError,
} from 'src/decorators/swagger-error-responses.decorator';
import { ResponseMessage } from 'src/decorators/response-message.decorator';
import {
    explore_root_swagger,
    search_latest_posts,
    trending_swagger,
    who_to_follow_swagger,
    category_wise_trending_swagger,
} from './explore.swagger';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from 'src/constants/swagger-messages';
import { ExploreService } from './explore.service';
import { GetUserId } from 'src/decorators/get-userId.decorator';
import { Public } from 'src/decorators/public.decorator';

@ApiTags('Explore')
@Controller('explore')
export class ExploreController {
    constructor(private readonly explore_service: ExploreService) {}

    @ApiOperation(explore_root_swagger.operation)
    @ApiOkResponse(explore_root_swagger.responses.success)
    @ApiInternalServerError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    @ResponseMessage(SUCCESS_MESSAGES.EXPLORE_DATA_RETRIEVED)
    @Public()
    @Get()
    async getExploreData(@GetUserId() user_id: string) {
        return await this.explore_service.getExploreData(user_id);
    }

    @ApiOperation(trending_swagger.operation)
    @ApiOkResponse(trending_swagger.responses.success)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.INVALID_CATEGORY_PARAMETER)
    @ApiInternalServerError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    @ResponseMessage(SUCCESS_MESSAGES.EXPLORE_TRENDING_RETRIEVED)
    @ApiQuery(trending_swagger.queries.category)
    @ApiQuery(trending_swagger.queries.country)
    @Get('trending')
    async getTrending(@Query('category') category?: string, @Query('country') country?: string) {
        return await this.explore_service.getTrending(category, country);
    }

    @ApiOperation(who_to_follow_swagger.operation)
    @ApiOkResponse(who_to_follow_swagger.responses.success)
    @ApiInternalServerError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    @ResponseMessage(SUCCESS_MESSAGES.EXPLORE_WHO_TO_FOLLOW_RETRIEVED)
    @Get('who-to-follow')
    async getWhoToFollow() {
        return await this.explore_service.getWhoToFollow();
    }
    @ApiOperation(category_wise_trending_swagger.operation)
    @ApiOkResponse(category_wise_trending_swagger.responses.success)
    @ApiInternalServerError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    @ResponseMessage(SUCCESS_MESSAGES.EXPLORE_TRENDING_RETRIEVED)
    @ApiParam(category_wise_trending_swagger.params.category_id)
    @Get('category/:category_id')
    async getCategoryWiseTrending(
        @Param('category_id') category_id: string,
        @GetUserId() user_id: string
    ) {
        return await this.explore_service.getCategoryTrending(category_id, user_id);
    }

    // @ApiOperation(search_latest_posts.operation)
    // @ApiOkResponse(search_latest_posts.responses.success)
    // @ApiBadRequestErrorResponse(ERROR_MESSAGES.INVALID_CATEGORY_PARAMETER)
    // @ApiInternalServerError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    // @ResponseMessage(SUCCESS_MESSAGES.EXPLORE_FOR_YOU_POSTS_RETRIEVED)
    // @ApiQuery(search_latest_posts.queries.category)
    // @Get('for-you-posts')
    // async getForYouPosts(@Query('category') category?: string) {
    //     return await this.explore_service.getForYouPosts(category);
    // }
}

import { Controller, Get, Optional, Param, Query, UseGuards } from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiTags,
} from '@nestjs/swagger';
import {
    ApiBadRequestErrorResponse,
    ApiInternalServerError,
} from 'src/decorators/swagger-error-responses.decorator';
import { ResponseMessage } from 'src/decorators/response-message.decorator';
import {
    category_wise_trending_swagger,
    explore_root_swagger,
    search_latest_posts,
    trending_swagger,
    who_to_follow_swagger,
} from './explore.swagger';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from 'src/constants/swagger-messages';
import { ExploreService } from './explore.service';
import { GetUserId } from 'src/decorators/get-userId.decorator';
import { Public } from 'src/decorators/public.decorator';
import { OptionalJwtAuthGuard } from 'src/auth/guards/optional-jwt.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { JwtStrategy } from 'src/auth/strategies/jwt.strategy';

@ApiTags('Explore')
@ApiBearerAuth('JWT-auth')
@Controller('explore')
export class ExploreController {
    constructor(private readonly explore_service: ExploreService) {}

    @ApiOperation(explore_root_swagger.operation)
    @ApiOkResponse(explore_root_swagger.responses.success)
    @ApiInternalServerError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    @ResponseMessage(SUCCESS_MESSAGES.EXPLORE_DATA_RETRIEVED)
    @ApiBearerAuth('JWT-auth')
    @UseGuards(OptionalJwtAuthGuard)
    @Get()
    async getExploreData(@GetUserId() user_id: string) {
        return await this.explore_service.getExploreData(user_id);
    }

    @ApiOperation(who_to_follow_swagger.operation)
    @ApiOkResponse(who_to_follow_swagger.responses.success)
    @ApiInternalServerError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    @ResponseMessage(SUCCESS_MESSAGES.EXPLORE_WHO_TO_FOLLOW_RETRIEVED)
    @UseGuards(OptionalJwtAuthGuard)
    @Get('who-to-follow')
    async getWhoToFollow(@GetUserId() user_id: string) {
        return await this.explore_service.getWhoToFollow(user_id);
    }

    @ApiOperation(category_wise_trending_swagger.operation)
    @ApiOkResponse(category_wise_trending_swagger.responses.success)
    @ApiInternalServerError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    @ResponseMessage(SUCCESS_MESSAGES.EXPLORE_TRENDING_RETRIEVED)
    @ApiParam(category_wise_trending_swagger.params.category_id)
    @ApiQuery(category_wise_trending_swagger.queries.page)
    @ApiQuery(category_wise_trending_swagger.queries.limit)
    @UseGuards(OptionalJwtAuthGuard)
    @Get('category/:category_id')
    async getCategoryWiseTrending(
        @Param('category_id') category_id: string,
        @GetUserId() user_id: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string
    ) {
        const parsed_page = page ? parseInt(page, 10) : 1;
        const parsed_limit = limit ? parseInt(limit, 10) : 20;
        return await this.explore_service.getCategoryTrending(
            category_id,
            user_id,
            parsed_page,
            parsed_limit
        );
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

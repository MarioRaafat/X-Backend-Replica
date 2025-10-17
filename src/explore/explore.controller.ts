import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { ApiBadRequestErrorResponse } from 'src/decorators/swagger-error-responses.decorator';
import { ResponseMessage } from 'src/decorators/response-message.decorator';
import {
  search_latest_posts,
  trending_swagger,
  who_to_follow_swagger,
} from './explore.swagger';
import {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from 'src/constants/swagger-messages';
import { ExploreService } from './explore.service';

@ApiTags('Explore')
@Controller('explore')
export class ExploreController {
  constructor(private readonly explore_service: ExploreService) {}

  @ApiOperation({ summary: 'Explore root' })
  @ApiOkResponse({ description: 'Explore root response' })
  @Get()
  async root() {
    return this.explore_service.root();
  }

  @ApiOperation(trending_swagger.operation)
  @ApiOkResponse(trending_swagger.responses.success)
  @ResponseMessage(SUCCESS_MESSAGES.EXPLORE_TRENDING_RETRIEVED)
  @ApiQuery({
    name: 'category',
    required: false,
    enum: ['none', 'sports', 'entertainment'],
  })
  @ApiQuery({ name: 'country', required: false })
  @Get('trending')
  async getTrending(
    @Query('category') category?: string,
    @Query('country') country?: string,
  ) {
    return await this.explore_service.getTrending(category, country);
  }

  @ApiOperation(who_to_follow_swagger.operation)
  @ApiOkResponse(who_to_follow_swagger.responses.success)
  @ResponseMessage(SUCCESS_MESSAGES.EXPLORE_WHO_TO_FOLLOW_RETRIEVED)
  @Get('who-to-follow')
  async getWhoToFollow() {
    return await this.explore_service.getWhoToFollow();
  }

  @ApiOperation(search_latest_posts.operation)
  @ApiOkResponse(search_latest_posts.responses.success)
  @ApiBadRequestErrorResponse(ERROR_MESSAGES.INVALID_SEARCH_QUERY)
  @ResponseMessage(SUCCESS_MESSAGES.EXPLORE_FOR_YOU_POSTS_RETRIEVED)
  @ApiQuery({
    name: 'category',
    required: false,
    enum: ['sports', 'music', 'news', 'entertainment'],
  })
  @Get('for-you-posts')
  async getForYouPosts(@Query('category') category?: string) {
    return await this.explore_service.getForYouPosts(category);
  }
}

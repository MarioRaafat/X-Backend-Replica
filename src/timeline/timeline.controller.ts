import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TimelineService } from './timeline.service';
import {
    ApiBearerAuth,
    ApiBody,
    ApiOkResponse,
    ApiOperation,
    ApiQuery,
    ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { TimelinePaginationDto } from './dto/timeline-pagination.dto';
import { MentionsDto } from './dto/mentions.dto';
import { TrendsDto } from './dto/trends.dto';
import { GetUserId } from 'src/decorators/get-userId.decorator';
import { TimelineResponseDto } from './dto/timeline-response.dto';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from 'src/constants/swagger-messages';
import {
    ApiBadRequestErrorResponse,
    ApiUnauthorizedErrorResponse,
} from 'src/decorators/swagger-error-responses.decorator';
import { timeline_swagger } from './timeline.swagger';
import { ResponseMessage } from 'src/decorators/response-message.decorator';
import { ApiStatus } from 'src/decorators/api-status.decorator';

@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@ApiTags('Timeline')
@Controller('timeline')
export class TimelineController {
    constructor(private readonly timelineService: TimelineService) {}

    @ApiStatus('implemented')
    @ApiOperation(timeline_swagger.for_you.operation)
    @ApiQuery(timeline_swagger.api_query.limit)
    @ApiQuery(timeline_swagger.api_query.cursor)
    @ApiQuery(timeline_swagger.api_query.since_id)
    @ApiOkResponse(timeline_swagger.responses.success)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.INVALID_PAGINATION_PARAMETERS)
    @ResponseMessage(SUCCESS_MESSAGES.TIMELINE_RETRIEVED)
    @Get('/for-you')
    async getForyouTimeline(
        @GetUserId() user_id: string,
        @Query() pagination: TimelinePaginationDto
    ) {
        return await this.timelineService.getForyouTimeline(user_id, pagination);
    }
    @ApiStatus('implemented')
    @ApiOperation(timeline_swagger.following.operation)
    @ApiQuery(timeline_swagger.api_query.limit)
    @ApiQuery(timeline_swagger.api_query.cursor)
    @ApiQuery(timeline_swagger.api_query.since_id)
    @ApiOkResponse(timeline_swagger.responses.success)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.INVALID_PAGINATION_PARAMETERS)
    @ResponseMessage(SUCCESS_MESSAGES.TIMELINE_RETRIEVED)
    @Get('/following')
    async getFollowingTimeline(
        @GetUserId() user_id: string,
        @Query() pagination: TimelinePaginationDto
    ) {
        return await this.timelineService.getFollowingTimeline(user_id, pagination);
    }

    @ApiOperation(timeline_swagger.mentions.operation)
    @ApiOkResponse(timeline_swagger.responses.mentions_success)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.INVALID_PAGINATION_PARAMETERS)
    @ResponseMessage(SUCCESS_MESSAGES.MENTIONS_RETRIEVED)
    @Get('/mentions')
    async getMentions(@GetUserId() user_id: string, @Query() mentions: MentionsDto) {}

    @ApiOperation(timeline_swagger.trends.operation)
    @ApiQuery(timeline_swagger.api_query.category)
    @ApiOkResponse(timeline_swagger.responses.trends_success)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.INVALID_CATEGORY_PARAMETER)
    @ResponseMessage(SUCCESS_MESSAGES.TRENDS_RETRIEVED)
    @Get('/trends')
    async getTrends(@Query() trends: TrendsDto) {}
}

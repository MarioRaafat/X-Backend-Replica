import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TimelineService } from './timeline.service';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { TimelinePaginationDto } from './dto/timeline-pagination.dto';
import { GetUserId } from 'src/decorators/get-userId.decorator';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from 'src/constants/swagger-messages';
import {
    ApiBadRequestErrorResponse,
    ApiUnauthorizedErrorResponse,
} from 'src/decorators/swagger-error-responses.decorator';
import { timeline_swagger } from './timeline.swagger';
import { ResponseMessage } from 'src/decorators/response-message.decorator';
import { ApiImplementationStatus, ImplementationStatus } from 'src/decorators/api-status.decorator';
import { ForyouService } from './services/foryou/for-you.service';

@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@ApiTags('Timeline')
@Controller('timeline')
export class TimelineController {
    constructor(
        private readonly timeline_service: TimelineService,
        private readonly foryou_service: ForyouService
    ) {}

    @ApiImplementationStatus({
        status: ImplementationStatus.IN_PROGRESS,
        summary: timeline_swagger.for_you.operation.summary,
    })
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
        return await this.foryou_service.getForyouTimeline(
            user_id,
            pagination.cursor,
            pagination.limit
        );
    }

    @ApiImplementationStatus({
        status: ImplementationStatus.IMPLEMENTED,
        summary: timeline_swagger.following.operation.summary,
    })
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
        return await this.timeline_service.getFollowingTimeline(user_id, pagination);
    }
}

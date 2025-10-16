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
import { GetUserId } from 'src/decorators/get-userId.decorator';
import { TimelineResponseDto } from './dto/timeline-response.dto';
import { ERROR_MESSAGES } from 'src/constants/swagger-messages';
import {
  ApiBadRequestErrorResponse,
  ApiUnauthorizedErrorResponse,
} from 'src/decorators/swagger-error-responses.decorator';
import { timeline_swagger } from './timeline.swagger';
@ApiTags('Timeline')
@Controller('timeline')
export class TimelineController {
  constructor(private readonly timelineService: TimelineService) {}
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation(timeline_swagger.for_you.operation)
  @ApiQuery(timeline_swagger.api_query.limit)
  @ApiQuery(timeline_swagger.api_query.cursor)
  @ApiQuery(timeline_swagger.api_query.since_id)
  @ApiOkResponse(timeline_swagger.responses.success)
  @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
  @ApiBadRequestErrorResponse(ERROR_MESSAGES.INVALID_PAGINATION_PARAMETERS)
  @Get('/for-you')
  async getForyouTimeline(
    @GetUserId() user_id: string,
    @Query() pagination: TimelinePaginationDto,
  ) {}

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation(timeline_swagger.following.operation)
  @ApiQuery(timeline_swagger.api_query.limit)
  @ApiQuery(timeline_swagger.api_query.cursor)
  @ApiQuery(timeline_swagger.api_query.since_id)
  @ApiOkResponse(timeline_swagger.responses.success)
  @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
  @ApiBadRequestErrorResponse(ERROR_MESSAGES.INVALID_PAGINATION_PARAMETERS)
  @Get('/following')
  async getFollowingTimeline(
    @GetUserId() user_id: string,
    @Query() pagination: TimelinePaginationDto,
  ) {}
}

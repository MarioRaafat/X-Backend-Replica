import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiExtraModels,
    ApiOkResponse,
    ApiOperation,
    ApiQuery,
    ApiTags,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { GetUserId } from 'src/decorators/get-userId.decorator';
import { NotificationsResponseDto } from './dto/notifications-response.dto';
import { FollowNotificationDto } from './dto/follow-notification.dto';
import { LikeNotificationDto } from './dto/like-notification.dto';
import { ReplyNotificationDto } from './dto/reply-notification.dto';
import { RepostNotificationDto } from './dto/repost-notification.dto';
import { QuoteNotificationDto } from './dto/quote-notification.dto';
import { MentionNotificationDto } from './dto/mention-notification.dto';
import { MessageNotificationDto } from './dto/message-notification.dto';
import {
    get_mentions_and_replies_swagger,
    get_user_notifications_swagger,
} from './notification.swagger';
import {
    ApiInternalServerError,
    ApiUnauthorizedErrorResponse,
} from 'src/decorators/swagger-error-responses.decorator';
import { ERROR_MESSAGES } from 'src/constants/swagger-messages';

@ApiTags('Notifications')
@ApiExtraModels(
    NotificationsResponseDto,
    FollowNotificationDto,
    LikeNotificationDto,
    ReplyNotificationDto,
    RepostNotificationDto,
    QuoteNotificationDto,
    MentionNotificationDto,
    MessageNotificationDto
)
@Controller('notifications')
export class NotificationsController {
    constructor(private readonly notifications_service: NotificationsService) {}

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation(get_user_notifications_swagger.operation)
    @ApiOkResponse(get_user_notifications_swagger.responses.ok)
    @ApiQuery({
        name: 'page',
        required: false,
        type: Number,
        description: 'Page number (default: 1)',
    })
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiInternalServerError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    @Get()
    async getUserNotifications(
        @GetUserId() user_id: string,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number
    ): Promise<NotificationsResponseDto> {
        return await this.notifications_service.getUserNotifications(user_id, page);
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation(get_mentions_and_replies_swagger.operation)
    @ApiOkResponse(get_mentions_and_replies_swagger.responses.ok)
    @ApiQuery({
        name: 'page',
        required: false,
        type: Number,
        description: 'Page number (default: 1)',
    })
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiInternalServerError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    @Get('mentions')
    async getMentions(
        @GetUserId() user_id: string,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number
    ): Promise<NotificationsResponseDto> {
        return await this.notifications_service.getMentionsAndReplies(user_id, page);
    }
}

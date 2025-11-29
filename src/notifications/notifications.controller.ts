import { Controller, Get, UseGuards } from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiExtraModels,
    ApiOkResponse,
    ApiOperation,
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
import { get_user_notifications_swagger } from './notification.swagger';
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
    QuoteNotificationDto
)
@Controller('notifications')
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) {}

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation(get_user_notifications_swagger.operation)
    @ApiOkResponse(get_user_notifications_swagger.responses.ok)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiInternalServerError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    @Get()
    async getUserNotifications(@GetUserId() user_id: string): Promise<NotificationsResponseDto> {
        const notifications = await this.notificationsService.getUserNotifications(user_id);
        return { notifications };
    }

    // @ApiOperation({
    //     summary: 'WebSocket API Documentation',
    //     description: `
    //     WebSocket Only - No REST endpoints available.
    //     Server Events
    //     - "notifications:all" - All notifications list
    //     - "notifications:mentions" - Mentions list
    //     - "notifications:new" - Real-time push
    //     - "notifications:count" - Unseen count update
    //     newestData Field
    //     - Type: "string | null"
    //     - Value: ISO8601 timestamp of last unseen notification
    //     - "null" when all seen
    //     Example
    //     const socket = io('ws://server/notifications', {
    //         auth: { token: jwt }
    //     });
    //     socket.on('notifications:all', (data) => {
    //         data.notifications, data.unseenCount, data.newestData
    //     });
    // `,
    // })
    // @ApiResponse({
    //     status: 200,
    //     description: 'WebSocket event structure',
    //     schema: {
    //         type: 'object',
    //         example: notifications_websocket,
    //     },
    // })
    // @Get('docs')
    // getDocs() {
    //     return notifications_websocket;
    // }
}

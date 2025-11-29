import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { GetUserId } from 'src/decorators/get-userId.decorator';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) {}

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get user notifications' })
    @ApiOkResponse({ description: 'Returns all notifications for the user' })
    @Get()
    async getUserNotifications(@GetUserId() user_id: string) {
        return this.notificationsService.getUserNotifications(user_id);
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

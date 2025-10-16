import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NOTIFICATIONS_WEBSOCKET } from './notification.swagger';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  @Get('docs')
  @ApiOperation({
    summary: 'WebSocket API Documentation',
    description: `
        WebSocket Only - No REST endpoints available.

        Server Events
        - "notifications:all" - All notifications list
        - "notifications:mentions" - Mentions list
        - "notifications:new" - Real-time push
        - "notifications:count" - Unseen count update

        newestData Field
        - Type: "string | null"
        - Value: ISO8601 timestamp of last unseen notification
        - "null" when all seen

        Example
        const socket = io('ws://server/notifications', {
            auth: { token: jwt }
        });

        socket.on('notifications:all', (data) => {
            data.notifications, data.unseenCount, data.newestData
        });
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'WebSocket event structure',
    schema: {
      type: 'object',
      example: NOTIFICATIONS_WEBSOCKET,
    },
  })
  getDocs() {
    return NOTIFICATIONS_WEBSOCKET;
  }
}


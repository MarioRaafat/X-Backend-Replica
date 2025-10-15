import { Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Query, Req } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notifications.entity';
import { ApiBody, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NotificationResponseDto } from './dto/notification-response.dto';

const USER_ID = "";

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
    constructor(
        private readonly notificationsService: NotificationsService,
    ) {}

    @Get("all")
    @ApiOperation({
        summary: 'Get paginated notifications for a specific user',
        description:
        'Fetch notifications for a given user, with pagination support. Each notification may include aggregated actions (e.g., multiple users liking a post).',
    })
    @ApiParam({
        name: 'userId',
        required: true,
        description: 'The user ID whose notifications are being requested',
        example: '66f72f92c9b3f4a8f7b7d8b1',
    })
    @ApiQuery({
        name: 'page',
        required: false,
        description: 'Page number (starts from 1)',
        example: 1,
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        description: 'Number of notifications per page (default: 10)',
        example: 10,
    })
    @ApiOkResponse({
        description: 'Paginated list of user notifications',
        type: NotificationResponseDto,
    })
    async getUserNotifications(@Req() req: Request) {
        // const userId = req.user.userId;
        return await this.notificationsService.getUserNotifications(USER_ID);
    }
    
    @Get("mentions")
    @ApiOperation({
        summary: 'Get paginated mentions notifications for a specific user',
        description:
        'Fetch mentions notifications for a given user, with pagination support. Each notification may include aggregated actions (e.g., multiple users liking a post).',
    })
    @ApiParam({
        name: 'userId',
        required: true,
        description: 'The user ID whose notifications are being requested',
        example: '66f72f92c9b3f4a8f7b7d8b1',
    })
    @ApiQuery({
        name: 'page',
        required: false,
        description: 'Page number (starts from 1)',
        example: 1,
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        description: 'Number of notifications per page (default: 10)',
        example: 10,
    })
    @ApiOkResponse({
        description: 'Paginated list of user mentions notifications',
        type: NotificationResponseDto,
    })
    async getUserMentionsNotifications(@Req() req: Request) {
        // const userId = req.user.userId;
        return await this.notificationsService.getUserMentionsNotifications(USER_ID);
    }

    @Patch('seen')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Mark notifications as seen',
        description:
        'Marks all notifications for the authenticated user as seen. Returns status 200 on success or an error status on failure.',
    })
    @ApiResponse({
        status: 200,
        description: 'Notifications marked as seen successfully (no response body)',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid request or user not found',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized',
    })
    @ApiResponse({
        status: 500,
        description: 'Internal server error',
    })
    async markNotificationsAsSeen(@Req() req: Request): Promise<void> {
        // const userId = req.user.userId;
        return this.notificationsService.markNotificationsAsSeen(USER_ID);
    }

    // --- GET /notifications/count ---
    @Get('count')
    @ApiOperation({ summary: 'Get count of unseen notifications' })
    @ApiResponse({
        status: 200,
        description: 'Number of unseen notifications',
        schema: { example: { count: 5 } },
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 500, description: 'Internal Server Error' })
    async getUnseenNotificationsCount(@Req() req: Request) {
        // const userId = req.user.userId;
        return this.notificationsService.getUnseenCount(USER_ID);
    }

    // Just for testing RabbitMQ integration
    @Get('enqueue')
    async enqueue() {
        
        const testObject = {
            user: "bb4569af-45a5-42ba-b65c-fe8261e09d6c",
            notifications: []
        };
        console.log("HEY");
        return await this.notificationsService.temp(testObject);
    }
}

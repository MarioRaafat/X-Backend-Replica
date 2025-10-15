import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notifications.entity';

@Controller('notifications')
export class NotificationsController {
    constructor(
        private readonly notificationsService: NotificationsService
    ) {}

    @Get(":id")
    async getUserNotifications(@Param('id', new ParseUUIDPipe({ version: "4" })) id: string) {
        return await this.notificationsService.getUserNotifications(id);
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

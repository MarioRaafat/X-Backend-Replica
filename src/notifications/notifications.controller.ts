import { Controller, Get, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
    constructor(
        private readonly notificationsService: NotificationsService
    ) {}

    @Get('enqueue')
    async enqueue(@Query('email') email: string, @Query('msg') msg: string) {
        return await this.notificationsService.sendNotification(email, msg);
    }
}

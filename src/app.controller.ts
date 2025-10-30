import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiResponse } from '@nestjs/swagger';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from './decorators/response-message.decorator';

@ApiTags('Health')
@Controller('health')
export class AppController {
    constructor(private readonly app_service: AppService) {}

    @ApiOperation({ summary: 'Check application health status' })
    @ApiResponse({ status: 200, description: 'check if the application is running' })
    @ResponseMessage('Application is running')
    @Get()
    checkHealth(): string {
        return this.app_service.getHealthStatus();
    }
}

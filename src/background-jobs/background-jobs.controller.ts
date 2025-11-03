import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BackgroundJobsService } from './background-jobs.service';

@ApiTags('Background Jobs')
@Controller('background-jobs')
export class BackgroundJobsController {
    constructor(private readonly background_jobs_service: BackgroundJobsService) {}

    @Get('email-queue/stats')
    @ApiOperation({ summary: 'Get email queue statistics' })
    @ApiResponse({ status: 200, description: 'Email queue statistics retrieved successfully' })
    async getEmailQueueStats() {
        const stats = await this.background_jobs_service.getEmailQueueStats();
        return {
            data: stats,
        };
    }

    @Get('email-queue/pause')
    @ApiOperation({ summary: 'Pause email queue processing' })
    @ApiResponse({ status: 200, description: 'Email queue paused successfully' })
    async pauseEmailQueue() {
        const result = await this.background_jobs_service.pauseEmailQueue();
        return result;
    }

    @Get('email-queue/resume')
    @ApiOperation({ summary: 'Resume email queue processing' })
    @ApiResponse({ status: 200, description: 'Email queue resumed successfully' })
    async resumeEmailQueue() {
        const result = await this.background_jobs_service.resumeEmailQueue();
        return result;
    }

    @Get('email-queue/clean')
    @ApiOperation({ summary: 'Clean completed and failed jobs from email queue' })
    @ApiResponse({ status: 200, description: 'Email queue cleaned successfully' })
    async cleanEmailQueue() {
        const result = await this.background_jobs_service.cleanEmailQueue();
        return result;
    }
}
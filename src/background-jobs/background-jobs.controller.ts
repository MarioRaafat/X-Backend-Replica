import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BackgroundJobsService } from './background-jobs.service';
import { TrendingScoreCron } from './cron/trending-score.cron';
import { TrendingScoreJobDto } from './dto/trending-job.dto';

@ApiTags('Background Jobs')
@Controller('background-jobs')
export class BackgroundJobsController {
    constructor(
        private readonly background_jobs_service: BackgroundJobsService,
        private readonly trending_score_cron: TrendingScoreCron
    ) {}

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

    // Trending Score Endpoints
    @Post('trending/trigger')
    @ApiOperation({ summary: 'Manually trigger trending score recalculation' })
    @ApiResponse({ status: 200, description: 'Trending score job triggered successfully' })
    async triggerTrendingUpdate() {
        const result = await this.trending_score_cron.triggerManualUpdate();
        return result;
    }

    @Get('trending/queue/stats')
    @ApiOperation({ summary: 'Get trending score queue statistics' })
    @ApiResponse({ status: 200, description: 'Queue stats retrieved successfully' })
    async getTrendingQueueStats() {
        const stats = await this.trending_score_cron.getQueueStats();
        return {
            data: stats,
        };
    }
}

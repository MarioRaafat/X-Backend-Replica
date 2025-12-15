import { Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ExploreJobsService } from './explore-jobs.service';
import { EXPLORE_CONFIG, EXPLORE_JOB_PRIORITIES } from '../constants/queue.constants';
import { ExploreScoreJobDto } from './explore-job.dto';

@ApiTags('Background Jobs - Explore')
@Controller('background-jobs/explore')
export class ExploreController {
    constructor(private readonly explore_jobs_service: ExploreJobsService) {}

    @Post('trigger')
    @ApiOperation({ summary: 'Manually trigger explore score recalculation' })
    @ApiResponse({ status: 200, description: 'Explore score job triggered successfully' })
    async triggerExploreUpdate() {
        const job_data: ExploreScoreJobDto = {
            since_hours: EXPLORE_CONFIG.DEFAULT_SINCE_HOURS,
            max_age_hours: EXPLORE_CONFIG.DEFAULT_MAX_AGE_HOURS,
            batch_size: EXPLORE_CONFIG.DEFAULT_BATCH_SIZE,
            force_all: false,
        };

        return await this.explore_jobs_service.triggerScoreRecalculation(
            job_data,
            EXPLORE_JOB_PRIORITIES.HIGH // Higher priority for manual triggers
        );
    }

    @Get('status')
    @ApiOperation({ summary: 'Get explore job status and statistics' })
    @ApiResponse({ status: 200, description: 'Explore job status retrieved successfully' })
    async getExploreStatus() {
        const stats = await this.explore_jobs_service.getQueueStats();
        return {
            status: 'active',
            message: 'Explore jobs are running',
            queue_stats: stats,
        };
    }

    @Post('clear')
    @ApiOperation({ summary: 'Manually clear explore score recalculation' })
    @ApiResponse({ status: 200, description: 'Explore score job cleared successfully' })
    async clearExploreUpdate() {
        return await this.explore_jobs_service.clearScoreRecalculation();
    }
}

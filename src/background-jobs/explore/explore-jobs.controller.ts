import { Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ExploreJobsService } from './explore-jobs.service';

@ApiTags('Background Jobs - Explore')
@Controller('background-jobs/explore')
export class ExploreController {
    constructor(private readonly explore_jobs_service: ExploreJobsService) {}

    @Post('trigger')
    @ApiOperation({ summary: 'Manually trigger explore score recalculation' })
    @ApiResponse({ status: 200, description: 'Explore score job triggered successfully' })
    async triggerExploreUpdate() {
        await this.explore_jobs_service.triggerExploreScoreRecalculation();
        return {
            success: true,
            message: 'Explore score recalculation triggered successfully',
        };
    }

    @Get('status')
    @ApiOperation({ summary: 'Get explore job status and statistics' })
    @ApiResponse({ status: 200, description: 'Explore job status retrieved successfully' })
    async getExploreStatus() {
        // You can extend this to get actual queue stats
        return {
            status: 'active',
            message: 'Explore jobs are running',
        };
    }
}

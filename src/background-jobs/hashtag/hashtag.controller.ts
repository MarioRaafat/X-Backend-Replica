import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HashtagJobService } from './hashtag.service';

@ApiTags('Background Jobs')
@Controller('background-jobs')
export class HashtagController {
    constructor(private readonly hashtag_service: HashtagJobService) {}

    @Get('hashtag-queue/stats')
    @ApiOperation({ summary: 'Get hashtag queue statistics' })
    @ApiResponse({ status: 200, description: 'Hashtag queue statistics retrieved successfully' })
    async getHashtagQueueStats() {
        const stats = await this.hashtag_service.getHashtagQueueStats();
        return {
            data: stats,
        };
    }

    @Get('hashtag-queue/pause')
    @ApiOperation({ summary: 'Pause hashtag queue processing' })
    @ApiResponse({ status: 200, description: 'Hashtag queue paused successfully' })
    async pauseHashtagQueue() {
        const result = await this.hashtag_service.pauseHashtagQueue();
        return result;
    }

    @Get('hashtag-queue/resume')
    @ApiOperation({ summary: 'Resume hashtag queue processing' })
    @ApiResponse({ status: 200, description: 'Hashtag queue resumed successfully' })
    async resumeHashtagQueue() {
        const result = await this.hashtag_service.resumeHashtagQueue();
        return result;
    }

    @Get('hashtag-queue/clean')
    @ApiOperation({ summary: 'Clean completed and failed jobs from hashtag queue' })
    @ApiResponse({ status: 200, description: 'Hashtag queue cleaned successfully' })
    async cleanHashtagQueue() {
        const result = await this.hashtag_service.cleanHashtagQueue();
        return result;
    }
}

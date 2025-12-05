import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Post,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { AppService } from './app.service';
import { ApiBody, ApiConsumes, ApiResponse } from '@nestjs/swagger';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from './decorators/response-message.decorator';
import { FileInterceptor } from '@nestjs/platform-express';

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

@ApiTags('Testing Team')
@Controller('test')
export class TestController {
    constructor(private readonly app_service: AppService) {}

    @ApiOperation({
        summary: 'Seed test data for testing team',
        description:
            'Creates 10 test users with tweets, follows, replies, and likes. If data already exists, returns their information. Credentials are hardcoded for testing purposes.',
    })
    @ApiResponse({
        status: 200,
        description:
            'Test data seeded successfully with details of what was created or already existed',
    })
    @ResponseMessage('Test data seeding completed')
    @Post('seed-data')
    async seedTestData() {
        return await this.app_service.seedTestData();
    }

    @ApiOperation({
        summary: 'Clear all test data from database',
        description:
            'Deletes all test users and their associated data (tweets, follows, likes, replies) from the database.',
    })
    @ApiResponse({
        status: 200,
        description: 'Test data cleared successfully with count of deleted records',
    })
    @ResponseMessage('Test data cleared successfully')
    @Post('clear-data')
    async clearTestData() {
        return await this.app_service.clearTestData();
    }

    @ApiBody({
        schema: {
            type: 'object',
            required: ['file', 'password'],
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Image file to upload',
                },
                password: {
                    type: 'string',
                    description: 'Password for test team access',
                    example: "Don't touch it, it's for test team only!",
                },
            },
        },
    })
    @ApiConsumes('multipart/form-data')
    @Post('upload-image')
    @UseInterceptors(FileInterceptor('file'))
    async uploadTestImages(
        @UploadedFile() file: Express.Multer.File,
        @Body('password') password: string
    ) {
        if (password !== 'test team only') {
            throw new BadRequestException('Invalid password');
        }
        return await this.app_service.uploadAvatar('test-team', file);
    }
}

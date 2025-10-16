import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    HttpCode,
    HttpStatus,
    ParseUUIDPipe,
    Req,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiBearerAuth,
    ApiCreatedResponse,
    ApiOkResponse,
    ApiNoContentResponse,
} from '@nestjs/swagger';
import { CreateTweetDTO } from './dto/create-tweet.dto';
import { UpdateTweetDTO } from './dto/update-tweet.dto';
import { CreateTweetWithQuoteDTO } from './dto/create-tweet-with-quote.dto';
import { UpdateTweetWithQuoteDTO } from './dto/update-tweet-with-quote.dto';
import { Tweet } from './entities/tweet.entity';

@ApiTags('Tweets')
@ApiBearerAuth('JWT-auth')
@Controller('tweets')
export class TweetsController {
    constructor() {}

    @ApiOperation({
        summary: 'Create a new tweet',
        description: 'Creates a new tweet with optional images and videos. User ID is extracted from the authenticated user.',
    })
    @ApiCreatedResponse({
        description: 'Tweet created successfully',
        type: Tweet,
    })
    @Post()
    async createTweet(
        @Body() createTweetDto: CreateTweetDTO,
        @Req() req: Request,
    ) {}

    @ApiOperation({
        summary: 'Get all tweets',
        description: 'Retrieves all tweets with pagination support.',
    })
    @ApiQuery({
        name: 'page',
        required: false,
        type: Number,
        description: 'Page number (default: 1)',
        example: 1,
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Number of items per page (default: 20)',
        example: 20,
    })
    @ApiOkResponse({
        description: 'Tweets retrieved successfully',
    })
    @Get()
    async getAllTweets(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 20,
    ) {}

    @ApiOperation({
        summary: 'Get a tweet by ID',
        description: 'Retrieves a specific tweet by its unique identifier.',
    })
    @ApiParam({
        name: 'id',
        type: String,
        description: 'Tweet ID (UUID format)',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiOkResponse({
        description: 'Tweet retrieved successfully',
        type: Tweet,
    })
    @Get(':id')
    async getTweetById(@Param('id', ParseUUIDPipe) id: string) {}

    @ApiOperation({
        summary: 'Update a tweet',
        description: 'Updates an existing tweet. Only the tweet owner can update their tweet. Tweet ID is from URL param, user ID is from JWT token.',
    })
    @ApiParam({
        name: 'id',
        type: String,
        description: 'Tweet ID (UUID format)',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiOkResponse({
        description: 'Tweet updated successfully',
        type: Tweet,
    })
    @Patch(':id')
    async updateTweet(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateTweetDto: UpdateTweetDTO,
        @Req() req: Request,
    ) {}

    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({
        summary: 'Delete a tweet',
        description: 'Deletes a tweet. Only the tweet owner can delete their tweet. Tweet ID is from URL param, user ID is from JWT token.',
    })
    @ApiParam({
        name: 'id',
        type: String,
        description: 'Tweet ID (UUID format)',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiNoContentResponse({
        description: 'Tweet deleted successfully',
    })
    @Delete(':id')
    async deleteTweet(
        @Param('id', ParseUUIDPipe) id: string,
        @Req() req: Request,
    ) {}

    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Repost a tweet',
        description: 'Creates a simple repost of an existing tweet without additional commentary. User ID is from JWT token.',
    })
    @ApiParam({
        name: 'id',
        type: String,
        description: 'Original tweet ID to repost (UUID format)',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiCreatedResponse({
        description: 'Tweet reposted successfully (no body returned)',
    })
    @Post(':id/repost')
    async repostTweet(
        @Param('id', ParseUUIDPipe) id: string,
        @Req() req: Request,
    ) {}

    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Quote a tweet',
        description: 'Creates a repost with additional commentary (quote tweet). User ID is from JWT token.',
    })
    @ApiParam({
        name: 'id',
        type: String,
        description: 'Original tweet ID to quote (UUID format)',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiCreatedResponse({
        description: 'Quote tweet created successfully (no body returned)',
    })
    @Post(':id/quote')
    async quoteTweet(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() createQuoteDto: CreateTweetWithQuoteDTO,
        @Req() req: Request,
    ){}

    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({
        summary: 'Like a tweet',
        description: 'Adds a like to a tweet. A user can only like a tweet once. User ID is from JWT token.',
    })
    @ApiParam({
        name: 'id',
        type: String,
        description: 'Tweet ID to like (UUID format)',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiNoContentResponse({
        description: 'Tweet liked successfully',
    })
    @Post(':id/like')
    async likeTweet(
        @Param('id', ParseUUIDPipe) id: string,
        @Req() req: Request,
    ) {}

    // ==================== UNLIKE TWEET ====================
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({
        summary: 'Unlike a tweet',
        description: 'Removes a like from a tweet. User ID is from JWT token.',
    })
    @ApiParam({
        name: 'id',
        type: String,
        description: 'Tweet ID to unlike (UUID format)',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiNoContentResponse({
        description: 'Tweet unliked successfully',
    })
    @Delete(':id/like')
    async unlikeTweet(
        @Param('id', ParseUUIDPipe) id: string,
        @Req() req: Request,
    ) {}

    @ApiOperation({
        summary: 'Get tweet likes',
        description: 'Retrieves all users who have liked a specific tweet, including the total count.',
    })
    @ApiParam({
        name: 'id',
        type: String,
        description: 'Tweet ID (UUID format)',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiOkResponse({
        description: 'Tweet likes retrieved successfully',
    })
    @Get(':id/likes')
    async getTweetLikes(@Param('id', ParseUUIDPipe) id: string) {}

    @ApiOperation({
        summary: 'Update a quote tweet',
        description: 'Updates an existing quote tweet. Only the quote tweet owner can update it. Quote tweet ID is from URL param, user ID is from JWT token.',
    })
    @ApiParam({
        name: 'id',
        type: String,
        description: 'Quote Tweet ID (UUID format)',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiOkResponse({
        description: 'Quote tweet updated successfully',
        type: Tweet,
    })
    @Patch(':id/quote')
    async updateQuoteTweet(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateQuoteDto: UpdateTweetWithQuoteDTO,
        @Req() req: Request,
    ) {}
}


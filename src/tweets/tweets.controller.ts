import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiBody,
    ApiConsumes,
    ApiCreatedResponse,
    ApiNoContentResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiTags,
} from '@nestjs/swagger';
import { CreateTweetDTO } from './dto/create-tweet.dto';
import { UpdateTweetDTO } from './dto/update-tweet.dto';
import { UpdateTweetWithQuoteDTO } from './dto/update-tweet-with-quote.dto';
import { GetTweetsQueryDto } from './dto/get-tweets-query.dto';
import { GetTweetLikesQueryDto } from './dto/get-tweet-likes-query.dto';
import { GetTweetRepostsQueryDto } from './dto/get-tweet-reposts-query.dto';
import { GetTweetRepliesQueryDto } from './dto/get-tweet-replies-query.dto';
import { UploadMediaResponseDTO } from './dto/upload-media.dto';
import { PaginatedTweetsResponseDTO } from './dto/paginated-tweets-response.dto';
import { PaginatedTweetLikesResponseDTO } from './dto/paginated-tweet-likes-response.dto';
import { PaginatedTweetRepostsResponseDTO } from './dto/paginated-tweet-reposts-response.dto';
import { PaginatedTweetRepliesResponseDTO } from './dto/paginated-tweet-replies-response.dto';
import { PaginatedBookmarksResponseDTO } from './dto/paginated-bookmarks-response.dto';
import { TweetResponseDTO } from './dto/tweet-response.dto';
import { TweetsService } from './tweets.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { GetUserId } from '../decorators/get-userId.decorator';
import { ResponseMessage } from '../decorators/response-message.decorator';
import {
    ApiBadRequestErrorResponse,
    ApiForbiddenErrorResponse,
    ApiInternalServerError,
    ApiNotFoundErrorResponse,
    ApiUnauthorizedErrorResponse,
} from '../decorators/swagger-error-responses.decorator';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../constants/swagger-messages';
import {
    bookmark_tweet_swagger,
    create_tweet_swagger,
    delete_repost_swagger,
    delete_tweet_swagger,
    get_all_tweets_swagger,
    get_tweet_by_id_swagger,
    get_tweet_likes_swagger,
    get_tweet_quotes_swagger,
    get_tweet_replies_swagger,
    get_tweet_reposts_swagger,
    get_user_bookmarks_swagger,
    like_tweet_swagger,
    quote_tweet_swagger,
    reply_to_tweet_swagger,
    repost_tweet_swagger,
    track_tweet_view_swagger,
    unbookmark_tweet_swagger,
    unlike_tweet_swagger,
    update_quote_tweet_swagger,
    update_tweet_swagger,
    upload_image_swagger,
    upload_video_swagger,
} from './tweets.swagger';
import { ImageUploadInterceptor, VideoUploadInterceptor } from './utils/upload.interceptors';
import { QueryCursorPaginationDTO } from './dto/get-tweet-quotes-query.dto';
import { OptionalJwtAuthGuard } from 'src/auth/guards/optional-jwt.guard';

@ApiTags('Tweets')
@ApiBearerAuth('JWT-auth')
@Controller('tweets')
export class TweetsController {
    constructor(private readonly tweets_service: TweetsService) {}

    @ApiOperation(create_tweet_swagger.operation)
    @ApiBody({ type: CreateTweetDTO })
    @ApiCreatedResponse(create_tweet_swagger.responses.created)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.FAILED_TO_SAVE_IN_DB)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiInternalServerError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage(SUCCESS_MESSAGES.TWEET_CREATED)
    @UseGuards(JwtAuthGuard)
    @Post()
    async createTweet(@Body() create_tweet_dto: CreateTweetDTO, @GetUserId() user_id: string) {
        try {
            return await this.tweets_service.createTweet(create_tweet_dto, user_id);
        } catch (error) {
            console.error('Error creating tweet:', error);
            throw error;
        }
    }

    @ApiOperation(get_all_tweets_swagger.operation)
    @ApiOkResponse({
        description: 'Tweets retrieved successfully with pagination metadata',
        type: PaginatedTweetsResponseDTO,
    })
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiInternalServerError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    @ResponseMessage(SUCCESS_MESSAGES.TWEETS_RETRIEVED)
    @Get()
    async getAllTweets(@Query() query: GetTweetsQueryDto, @GetUserId() user_id?: string) {
        // return await this.tweets_service.getAllTweets(query, user_id);
        return;
    }

    @HttpCode(HttpStatus.OK)
    @ApiOperation(get_user_bookmarks_swagger.operation)
    @ApiQuery(get_user_bookmarks_swagger.queries.cursor)
    @ApiQuery(get_user_bookmarks_swagger.queries.limit)
    @ApiOkResponse({
        description: 'User bookmarks retrieved successfully with pagination metadata',
        type: PaginatedBookmarksResponseDTO,
    })
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiInternalServerError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    @ResponseMessage('User bookmarks retrieved successfully')
    @UseGuards(JwtAuthGuard)
    @Get('bookmarks')
    async getUserBookmarks(@Query() query: GetTweetRepliesQueryDto, @GetUserId() user_id: string) {
        return await this.tweets_service.getUserBookmarks(user_id, query.cursor, query.limit);
    }

    @ApiOperation(get_tweet_by_id_swagger.operation)
    @ApiParam(get_tweet_by_id_swagger.param)
    @ApiOkResponse(get_tweet_by_id_swagger.responses.success)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiInternalServerError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    @ResponseMessage(SUCCESS_MESSAGES.TWEET_RETRIEVED)
    @UseGuards(OptionalJwtAuthGuard)
    @Get(':id')
    async getTweetById(@Param('id', ParseUUIDPipe) id: string, @GetUserId() user_id: string) {
        return await this.tweets_service.getTweetById(id, user_id);
    }

    @ApiOperation(update_tweet_swagger.operation)
    @ApiParam(update_tweet_swagger.param)
    @ApiBody({ type: UpdateTweetDTO })
    @ApiOkResponse(update_tweet_swagger.responses.success)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiForbiddenErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiInternalServerError(ERROR_MESSAGES.FAILED_TO_UPDATE_IN_DB)
    @ResponseMessage(SUCCESS_MESSAGES.TWEET_UPDATED)
    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    async updateTweet(
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
        @Body() update_tweet_dto: UpdateTweetDTO,
        @GetUserId() user_id: string
    ) {
        return await this.tweets_service.updateTweet(update_tweet_dto, id, user_id);
    }

    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation(delete_tweet_swagger.operation)
    @ApiParam(delete_tweet_swagger.param)
    @ApiNoContentResponse(delete_tweet_swagger.responses.noContent)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiForbiddenErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiInternalServerError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    @ResponseMessage(SUCCESS_MESSAGES.TWEET_DELETED)
    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    async deleteTweet(@Param('id', ParseUUIDPipe) id: string, @GetUserId() user_id: string) {
        return await this.tweets_service.deleteTweet(id, user_id);
    }

    @HttpCode(HttpStatus.CREATED)
    @ApiOperation(repost_tweet_swagger.operation)
    @ApiParam(repost_tweet_swagger.param)
    @ApiCreatedResponse(repost_tweet_swagger.responses.created)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiInternalServerError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    @ResponseMessage(SUCCESS_MESSAGES.TWEET_REPOSTED)
    @UseGuards(JwtAuthGuard)
    @Post(':id/repost')
    async repostTweet(@Param('id', ParseUUIDPipe) id: string, @GetUserId() user_id: string) {
        return await this.tweets_service.repostTweet(id, user_id);
    }

    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation(delete_repost_swagger.operation)
    @ApiParam(delete_repost_swagger.param)
    @ApiNoContentResponse(delete_repost_swagger.responses.no_content)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiNotFoundErrorResponse('Repost not found or you are not authorized to delete it')
    @ApiForbiddenErrorResponse('You can only delete your own reposts')
    @ApiInternalServerError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    @ResponseMessage(SUCCESS_MESSAGES.REPOST_DELETED)
    @UseGuards(JwtAuthGuard)
    @Delete(':id/repost')
    async deleteRepost(
        @Param('id', ParseUUIDPipe) id: string,
        @GetUserId() user_id: string
    ): Promise<void> {
        return await this.tweets_service.deleteRepost(id, user_id);
    }

    @HttpCode(HttpStatus.CREATED)
    @ApiOperation(quote_tweet_swagger.operation)
    @ApiParam(quote_tweet_swagger.param)
    @ApiBody({ type: CreateTweetDTO })
    @ApiCreatedResponse(quote_tweet_swagger.responses.created)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiInternalServerError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    @ResponseMessage(SUCCESS_MESSAGES.TWEET_QUOTED)
    @UseGuards(JwtAuthGuard)
    @Post(':id/quote')
    async quoteTweet(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() create_quote_dto: CreateTweetDTO,
        @GetUserId() user_id: string
    ) {
        return await this.tweets_service.repostTweetWithQuote(id, user_id, create_quote_dto);
    }

    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Reply to a tweet' })
    @ApiParam({ name: 'id', description: 'UUID of the tweet to reply to', type: String })
    @ApiBody({ type: CreateTweetDTO })
    @ApiCreatedResponse({
        description: 'Reply created successfully',
        type: TweetResponseDTO,
    })
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.TWEET_NOT_FOUND)
    @ApiInternalServerError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    @ResponseMessage('Reply created successfully')
    @ApiOperation(reply_to_tweet_swagger.operation)
    @ApiParam(reply_to_tweet_swagger.param)
    @ApiBody(reply_to_tweet_swagger.body)
    @ApiCreatedResponse(reply_to_tweet_swagger.responses.created)
    @UseGuards(JwtAuthGuard)
    @Post(':id/reply')
    async replyToTweet(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() create_reply_dto: CreateTweetDTO,
        @GetUserId() user_id: string
    ) {
        return await this.tweets_service.replyToTweet(id, user_id, create_reply_dto);
    }

    @HttpCode(HttpStatus.CREATED)
    @ApiOperation(like_tweet_swagger.operation)
    @ApiParam(like_tweet_swagger.param)
    @ApiNoContentResponse(like_tweet_swagger.responses.noContent)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiInternalServerError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    @ResponseMessage(SUCCESS_MESSAGES.TWEET_LIKED)
    @UseGuards(JwtAuthGuard)
    @Post(':id/like')
    async likeTweet(@Param('id', ParseUUIDPipe) id: string, @GetUserId() user_id: string) {
        return await this.tweets_service.likeTweet(id, user_id);
    }

    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation(unlike_tweet_swagger.operation)
    @ApiParam(unlike_tweet_swagger.param)
    @ApiNoContentResponse(unlike_tweet_swagger.responses.noContent)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiInternalServerError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    @ResponseMessage(SUCCESS_MESSAGES.TWEET_UNLIKED)
    @UseGuards(JwtAuthGuard)
    @Delete(':id/like')
    async unlikeTweet(@Param('id', ParseUUIDPipe) id: string, @GetUserId() user_id: string) {
        return await this.tweets_service.unlikeTweet(id, user_id);
    }

    @HttpCode(HttpStatus.CREATED)
    @ApiOperation(bookmark_tweet_swagger.operation)
    @ApiParam(bookmark_tweet_swagger.param)
    @ApiNoContentResponse(bookmark_tweet_swagger.responses.noContent)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiInternalServerError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    @ResponseMessage(SUCCESS_MESSAGES.TWEET_BOOKMARKED)
    @UseGuards(JwtAuthGuard)
    @Post(':id/bookmark')
    async bookmarkTweet(@Param('id', ParseUUIDPipe) id: string, @GetUserId() user_id: string) {
        return await this.tweets_service.bookmarkTweet(id, user_id);
    }

    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation(unbookmark_tweet_swagger.operation)
    @ApiParam(unbookmark_tweet_swagger.param)
    @ApiNoContentResponse(unbookmark_tweet_swagger.responses.noContent)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiInternalServerError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    @ResponseMessage(SUCCESS_MESSAGES.TWEET_UNBOOKMARKED)
    @UseGuards(JwtAuthGuard)
    @Delete(':id/bookmark')
    async unbookmarkTweet(@Param('id', ParseUUIDPipe) id: string, @GetUserId() user_id: string) {
        return await this.tweets_service.unbookmarkTweet(id, user_id);
    }

    @ApiOperation(get_tweet_likes_swagger.operation)
    @ApiParam({
        name: 'id',
        type: String,
        description: 'The ID of the tweet',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiQuery({
        name: 'cursor',
        required: false,
        type: String,
        description: 'Cursor for pagination (user_id)',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Number of users to return (default: 20, max: 100)',
        example: 20,
    })
    @ApiOkResponse({
        description: 'Tweet likes retrieved successfully with pagination',
        type: PaginatedTweetLikesResponseDTO,
    })
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiForbiddenErrorResponse('Only the tweet owner can see who liked their tweet')
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.TWEET_NOT_FOUND)
    @ApiInternalServerError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    @ResponseMessage(SUCCESS_MESSAGES.TWEET_LIKES_RETRIEVED)
    @UseGuards(JwtAuthGuard)
    @Get(':id/likes')
    async getTweetLikes(
        @Param('id', ParseUUIDPipe) id: string,
        @Query() query: GetTweetRepliesQueryDto,
        @GetUserId() user_id: string
    ) {
        return await this.tweets_service.getTweetLikes(id, user_id, query.cursor, query.limit);
    }

    @ApiOperation(get_tweet_reposts_swagger.operation)
    @ApiParam({
        name: 'id',
        type: String,
        description: 'The ID of the tweet',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiQuery({
        name: 'cursor',
        required: false,
        type: String,
        description: 'Cursor for pagination (user_id)',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Number of users to return (default: 20, max: 100)',
        example: 20,
    })
    @ApiOkResponse({
        description: 'Tweet reposts retrieved successfully with pagination',
        type: PaginatedTweetRepostsResponseDTO,
    })
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiForbiddenErrorResponse('Only the tweet owner can see who reposted their tweet')
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.TWEET_NOT_FOUND)
    @ApiInternalServerError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    @ResponseMessage('Users who reposted the tweet retrieved successfully')
    @UseGuards(OptionalJwtAuthGuard)
    @Get(':id/reposts')
    async getTweetReposts(
        @Param('id', ParseUUIDPipe) id: string,
        @Query() query: GetTweetRepliesQueryDto,
        @GetUserId() user_id: string
    ) {
        return await this.tweets_service.getTweetReposts(id, user_id, query.cursor, query.limit);
    }

    @HttpCode(HttpStatus.OK)
    @ApiOperation(get_tweet_quotes_swagger.operation)
    @ApiParam(get_tweet_quotes_swagger.param)
    @ApiQuery(get_tweet_quotes_swagger.queries.cursor)
    @ApiQuery(get_tweet_quotes_swagger.queries.limit)
    @ApiOkResponse(get_tweet_quotes_swagger.responses.success)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.TWEET_NOT_FOUND)
    @ApiInternalServerError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    @ResponseMessage('Quote tweets retrieved successfully')
    @UseGuards(OptionalJwtAuthGuard)
    @Get(':id/quotes')
    async getTweetQuotes(
        @Param('id', ParseUUIDPipe) id: string,
        @Query() query: QueryCursorPaginationDTO,
        @GetUserId() user_id?: string
    ) {
        return await this.tweets_service.getTweetQuotes(id, user_id, query.cursor, query.limit);
    }

    @ApiOperation(get_tweet_replies_swagger.operation)
    @ApiOkResponse(get_tweet_replies_swagger.responses.success)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.TWEET_NOT_FOUND)
    @ApiInternalServerError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    @ResponseMessage(ERROR_MESSAGES.TWEET_REPLIES_RETRIEVED_SUCCESSFULLY)
    @UseGuards(OptionalJwtAuthGuard)
    @Get(':id/replies')
    async getTweetReplies(
        @Param('id', ParseUUIDPipe) id: string,
        @Query() query: GetTweetRepliesQueryDto,
        @GetUserId() user_id: string
    ) {
        return await this.tweets_service.getTweetReplies(id, user_id, query);
    }

    @ApiOperation(update_quote_tweet_swagger.operation)
    @ApiOperation(update_quote_tweet_swagger.operation)
    @ApiParam(update_quote_tweet_swagger.param)
    @ApiBody({ type: UpdateTweetWithQuoteDTO })
    @ApiOkResponse(update_quote_tweet_swagger.responses.success)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiForbiddenErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiInternalServerError(ERROR_MESSAGES.FAILED_TO_UPDATE_IN_DB)
    @ResponseMessage(SUCCESS_MESSAGES.QUOTE_TWEET_UPDATED)
    @UseGuards(JwtAuthGuard)
    @Patch(':id/quote')
    async updateQuoteTweet(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() update_quote_dto: UpdateTweetWithQuoteDTO,
        @GetUserId() user_id: string
    ) {}

    @HttpCode(HttpStatus.CREATED)
    @ApiOperation(upload_image_swagger.operation)
    @ApiConsumes('multipart/form-data')
    @ApiBody(upload_image_swagger.body)
    @ApiCreatedResponse(upload_image_swagger.responses.created)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.INVALID_FILE_TYPE)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiInternalServerError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    @ResponseMessage(SUCCESS_MESSAGES.IMAGE_UPLOADED)
    @UseInterceptors(ImageUploadInterceptor)
    @UseGuards(JwtAuthGuard)
    @Post('upload/image')
    async uploadImage(@UploadedFile() file: Express.Multer.File, @GetUserId() user_id: string) {
        if (!file) {
            throw new BadRequestException('No file provided');
        }

        return this.tweets_service.uploadImage(file, user_id);
    }

    @HttpCode(HttpStatus.CREATED)
    @ApiOperation(upload_video_swagger.operation)
    @ApiConsumes('multipart/form-data')
    @ApiBody(upload_video_swagger.body)
    @ApiCreatedResponse(upload_video_swagger.responses.created)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.INVALID_FILE_TYPE)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiInternalServerError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    @ResponseMessage(SUCCESS_MESSAGES.VIDEO_UPLOADED)
    @UseInterceptors(VideoUploadInterceptor)
    @UseGuards(JwtAuthGuard)
    @Post('upload/video')
    async uploadVideo(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException(ERROR_MESSAGES.NO_FILE_PROVIDED);
        }

        return this.tweets_service.uploadVideo(file);
    }

    @HttpCode(HttpStatus.OK)
    @ApiOperation(track_tweet_view_swagger.operation)
    @ApiParam(track_tweet_view_swagger.param)
    @ApiOkResponse(track_tweet_view_swagger.responses.success)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.TWEET_NOT_FOUND)
    @ApiInternalServerError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    @ResponseMessage(SUCCESS_MESSAGES.TWEET_VIEW_TRACKED)
    @UseGuards(OptionalJwtAuthGuard)
    @Post(':id/view')
    async trackTweetView(@Param('id', ParseUUIDPipe) id: string, @GetUserId() user_id: string) {
        return await this.tweets_service.incrementTweetViews(id);
    }

    /* Test Profile Functionalities */

    // @HttpCode(HttpStatus.OK)
    // @ApiOperation({ summary: 'Test: Get replies by user ID' })
    // @ApiQuery({ name: 'cursor', required: false, type: String })
    // @ApiQuery({ name: 'limit', required: false, type: Number })
    // @ResponseMessage('User replies retrieved successfully')
    // @Get('test/user/:user_id/replies')
    // async testGetRepliesByUserId(
    //     @Param('user_id', ParseUUIDPipe) user_id: string,
    //     @Query('cursor') cursor?: string,
    //     @Query('limit') limit?: number,
    //     @GetUserId() current_user_id?: string
    // ) {
    //     return await this.tweets_service.getRepliesByUserId(
    //         user_id,
    //         current_user_id,
    //         cursor,
    //         limit ? Number(limit) : 10
    //     );
    // }

    // @HttpCode(HttpStatus.OK)
    // @ApiOperation({ summary: 'Test: Get media posts by user ID' })
    // @ApiQuery({ name: 'cursor', required: false, type: String })
    // @ApiQuery({ name: 'limit', required: false, type: Number })
    // @ResponseMessage('User media posts retrieved successfully')
    // @Get('test/user/:user_id/media')
    // async testGetMediaByUserId(
    //     @Param('user_id', ParseUUIDPipe) user_id: string,
    //     @Query('cursor') cursor?: string,
    //     @Query('limit') limit?: number,
    //     @GetUserId() current_user_id?: string
    // ) {
    //     return await this.tweets_service.getMediaByUserId(
    //         user_id,
    //         current_user_id,
    //         cursor,
    //         limit ? Number(limit) : 10
    //     );
    // }

    // @HttpCode(HttpStatus.OK)
    // @ApiOperation({ summary: 'Test: Get liked posts by user ID' })
    // @ApiQuery({ name: 'cursor', required: false, type: String })
    // @ApiQuery({ name: 'limit', required: false, type: Number })
    // @ResponseMessage('User liked posts retrieved successfully')
    // @Get('test/user/:user_id/likes')
    // async testGetLikedPostsByUserId(
    //     @Param('user_id', ParseUUIDPipe) user_id: string,
    //     @Query('cursor') cursor?: string,
    //     @Query('limit') limit?: number,
    //     @GetUserId() current_user_id?: string
    // ) {
    //     return await this.tweets_service.getLikedPostsByUserId(
    //         user_id,
    //         current_user_id,
    //         cursor,
    //         limit ? Number(limit) : 10
    //     );
    // }
}

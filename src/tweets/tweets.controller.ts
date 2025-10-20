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
    ApiTags,
} from '@nestjs/swagger';
import { CreateTweetDTO } from './dto/create-tweet.dto';
import { UpdateTweetDTO } from './dto/update-tweet.dto';
import { UpdateTweetWithQuoteDTO } from './dto/update-tweet-with-quote.dto';
import { GetTweetsQueryDto } from './dto/get-tweets-query.dto';
import { UploadMediaResponseDTO } from './dto/upload-media.dto';
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
    create_tweet_swagger,
    delete_tweet_swagger,
    get_all_tweets_swagger,
    get_tweet_by_id_swagger,
    get_tweet_likes_swagger,
    like_tweet_swagger,
    quote_tweet_swagger,
    repost_tweet_swagger,
    unlike_tweet_swagger,
    update_quote_tweet_swagger,
    update_tweet_swagger,
    upload_image_swagger,
    upload_video_swagger,
} from './tweets.swagger';
import { ImageUploadInterceptor, VideoUploadInterceptor } from './utils/upload.interceptors';

@ApiTags('Tweets')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('tweets')
export class TweetsController {
    constructor(private readonly tweets_service: TweetsService) {}

    @ApiOperation(create_tweet_swagger.operation)
    @ApiBody({ type: CreateTweetDTO })
    @ApiCreatedResponse(create_tweet_swagger.responses.created)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.FAILED_TO_SAVE_IN_DB)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiInternalServerError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    @ResponseMessage(SUCCESS_MESSAGES.TWEET_CREATED)
    @Post()
    async createTweet(@Body() create_tweet_dto: CreateTweetDTO, @GetUserId() user_id: string) {}

    @ApiOperation(get_all_tweets_swagger.operation)
    @ApiOkResponse(get_all_tweets_swagger.responses.success)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiInternalServerError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    @ResponseMessage(SUCCESS_MESSAGES.TWEETS_RETRIEVED)
    @Get()
    async getAllTweets(@Query() query: GetTweetsQueryDto, @GetUserId() user_id: string) {}

    @ApiOperation(get_tweet_by_id_swagger.operation)
    @ApiParam(get_tweet_by_id_swagger.param)
    @ApiOkResponse(get_tweet_by_id_swagger.responses.success)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiInternalServerError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    @ResponseMessage(SUCCESS_MESSAGES.TWEET_RETRIEVED)
    @Get(':id')
    async getTweetById(@Param('id', ParseUUIDPipe) id: string, @GetUserId() user_id: string) {}

    @ApiOperation(update_tweet_swagger.operation)
    @ApiParam(update_tweet_swagger.param)
    @ApiBody({ type: UpdateTweetDTO })
    @ApiOkResponse(update_tweet_swagger.responses.success)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiForbiddenErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiInternalServerError(ERROR_MESSAGES.FAILED_TO_UPDATE_IN_DB)
    @ResponseMessage(SUCCESS_MESSAGES.TWEET_UPDATED)
    @Patch(':id')
    async updateTweet(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() update_tweet_dto: UpdateTweetDTO,
        @GetUserId() user_id: string
    ) {}

    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation(delete_tweet_swagger.operation)
    @ApiParam(delete_tweet_swagger.param)
    @ApiNoContentResponse(delete_tweet_swagger.responses.noContent)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiForbiddenErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiInternalServerError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    @ResponseMessage(SUCCESS_MESSAGES.TWEET_DELETED)
    @Delete(':id')
    async deleteTweet(@Param('id', ParseUUIDPipe) id: string, @GetUserId() user_id: string) {}

    @HttpCode(HttpStatus.CREATED)
    @ApiOperation(repost_tweet_swagger.operation)
    @ApiParam(repost_tweet_swagger.param)
    @ApiCreatedResponse(repost_tweet_swagger.responses.created)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiInternalServerError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    @ResponseMessage(SUCCESS_MESSAGES.TWEET_REPOSTED)
    @Post(':id/repost')
    async repostTweet(@Param('id', ParseUUIDPipe) id: string, @GetUserId() user_id: string) {}

    @HttpCode(HttpStatus.CREATED)
    @ApiOperation(quote_tweet_swagger.operation)
    @ApiParam(quote_tweet_swagger.param)
    @ApiBody({ type: CreateTweetDTO })
    @ApiCreatedResponse(quote_tweet_swagger.responses.created)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiInternalServerError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    @ResponseMessage(SUCCESS_MESSAGES.TWEET_QUOTED)
    @Post(':id/quote')
    async quoteTweet(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() create_quote_dto: CreateTweetDTO,
        @GetUserId() user_id: string
    ) {}

    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation(like_tweet_swagger.operation)
    @ApiParam(like_tweet_swagger.param)
    @ApiNoContentResponse(like_tweet_swagger.responses.noContent)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiInternalServerError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    @ResponseMessage(SUCCESS_MESSAGES.TWEET_LIKED)
    @Post(':id/like')
    async likeTweet(@Param('id', ParseUUIDPipe) id: string, @GetUserId() user_id: string) {}

    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation(unlike_tweet_swagger.operation)
    @ApiParam(unlike_tweet_swagger.param)
    @ApiNoContentResponse(unlike_tweet_swagger.responses.noContent)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiInternalServerError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    @ResponseMessage(SUCCESS_MESSAGES.TWEET_UNLIKED)
    @Delete(':id/like')
    async unlikeTweet(@Param('id', ParseUUIDPipe) id: string, @GetUserId() user_id: string) {}

    @ApiOperation(get_tweet_likes_swagger.operation)
    @ApiParam(get_tweet_likes_swagger.param)
    @ApiOkResponse(get_tweet_likes_swagger.responses.success)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiInternalServerError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    @ResponseMessage(SUCCESS_MESSAGES.TWEET_LIKES_RETRIEVED)
    @Get(':id/likes')
    async getTweetLikes(@Param('id', ParseUUIDPipe) id: string, @GetUserId() user_id: string) {}

    @ApiOperation(update_quote_tweet_swagger.operation)
    @ApiParam(update_quote_tweet_swagger.param)
    @ApiBody({ type: UpdateTweetWithQuoteDTO })
    @ApiOkResponse(update_quote_tweet_swagger.responses.success)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiForbiddenErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiInternalServerError(ERROR_MESSAGES.FAILED_TO_UPDATE_IN_DB)
    @ResponseMessage(SUCCESS_MESSAGES.QUOTE_TWEET_UPDATED)
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
    @Post('upload/image')
    async uploadImage(@UploadedFile() file: Express.Multer.File, @GetUserId() user_id: string) {
        if (!file) {
            throw new BadRequestException(ERROR_MESSAGES.NO_FILE_PROVIDED);
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
    @Post('upload/video')
    async uploadVideo(@UploadedFile() file: Express.Multer.File, @GetUserId() user_id: string) {
        if (!file) {
            throw new BadRequestException(ERROR_MESSAGES.NO_FILE_PROVIDED);
        }

        return this.tweets_service.uploadVideo(file, user_id);
    }
}

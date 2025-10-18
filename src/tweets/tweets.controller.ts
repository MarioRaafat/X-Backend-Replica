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
    ApiBody,
} from '@nestjs/swagger';
import { CreateTweetDTO } from './dto/create-tweet.dto';
import { UpdateTweetDTO } from './dto/update-tweet.dto';
import { UpdateTweetWithQuoteDTO } from './dto/update-tweet-with-quote.dto';
import type { Request } from 'express';
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
} from './tweets.swagger';

@ApiTags('Tweets')
@ApiBearerAuth('JWT-auth')
@Controller('tweets')
export class TweetsController {
    constructor() {}

    @ApiOperation(create_tweet_swagger.operation)
    @ApiBody(create_tweet_swagger.body)
    @ApiCreatedResponse(create_tweet_swagger.responses.created)
    @Post()
    async createTweet(
        @Body() createTweetDto: CreateTweetDTO,
        @Req() req: Request,
    ) {}

    @ApiOperation(get_all_tweets_swagger.operation)
    @ApiQuery(get_all_tweets_swagger.queries.page)
    @ApiQuery(get_all_tweets_swagger.queries.limit)
    @ApiOkResponse(get_all_tweets_swagger.responses.success)
    @Get()
    async getAllTweets(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 20,
    ) {}

    @ApiOperation(get_tweet_by_id_swagger.operation)
    @ApiParam(get_tweet_by_id_swagger.param)
    @ApiOkResponse(get_tweet_by_id_swagger.responses.success)
    @Get(':id')
    async getTweetById(@Param('id', ParseUUIDPipe) id: string) {}

    @ApiOperation(update_tweet_swagger.operation)
    @ApiParam(update_tweet_swagger.param)
    @ApiBody(update_tweet_swagger.body)
    @ApiOkResponse(update_tweet_swagger.responses.success)
    @Patch(':id')
    async updateTweet(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateTweetDto: UpdateTweetDTO,
        @Req() req: Request,
    ) {}

    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation(delete_tweet_swagger.operation)
    @ApiParam(delete_tweet_swagger.param)
    @ApiNoContentResponse(delete_tweet_swagger.responses.noContent)
    @Delete(':id')
    async deleteTweet(
        @Param('id', ParseUUIDPipe) id: string,
        @Req() req: Request,
    ) {}

    @HttpCode(HttpStatus.CREATED)
    @ApiOperation(repost_tweet_swagger.operation)
    @ApiParam(repost_tweet_swagger.param)
    @ApiCreatedResponse(repost_tweet_swagger.responses.created)
    @Post(':id/repost')
    async repostTweet(
        @Param('id', ParseUUIDPipe) id: string,
        @Req() req: Request,
    ) {}

    @HttpCode(HttpStatus.CREATED)
    @ApiOperation(quote_tweet_swagger.operation)
    @ApiParam(quote_tweet_swagger.param)
    @ApiBody(quote_tweet_swagger.body)
    @ApiCreatedResponse(quote_tweet_swagger.responses.created)
    @Post(':id/quote')
    async quoteTweet(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() createQuoteDto: CreateTweetDTO,
        @Req() req: Request,
    ){}

    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation(like_tweet_swagger.operation)
    @ApiParam(like_tweet_swagger.param)
    @ApiNoContentResponse(like_tweet_swagger.responses.noContent)
    @Post(':id/like')
    async likeTweet(
        @Param('id', ParseUUIDPipe) id: string,
        @Req() req: Request,
    ) {}

    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation(unlike_tweet_swagger.operation)
    @ApiParam(unlike_tweet_swagger.param)
    @ApiNoContentResponse(unlike_tweet_swagger.responses.noContent)
    @Delete(':id/like')
    async unlikeTweet(
        @Param('id', ParseUUIDPipe) id: string,
        @Req() req: Request,
    ) {}

    @ApiOperation(get_tweet_likes_swagger.operation)
    @ApiParam(get_tweet_likes_swagger.param)
    @ApiOkResponse(get_tweet_likes_swagger.responses.success)
    @Get(':id/likes')
    async getTweetLikes(@Param('id', ParseUUIDPipe) id: string) {}

    @ApiOperation(update_quote_tweet_swagger.operation)
    @ApiParam(update_quote_tweet_swagger.param)
    @ApiBody(update_quote_tweet_swagger.body)
    @ApiOkResponse(update_quote_tweet_swagger.responses.success)
    @Patch(':id/quote')
    async updateQuoteTweet(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateQuoteDto: UpdateTweetWithQuoteDTO,
        @Req() req: Request,
    ) {}
}


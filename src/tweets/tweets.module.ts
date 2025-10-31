import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TweetsController } from './tweets.controller';
import { TweetsService } from './tweets.service';
import { Tweet, TweetLike, TweetQuote, TweetReply, TweetRepost } from './entities';
import { Hashtag } from './entities/hashtags.entity';
import { UserFollows } from 'src/user/entities/user-follows.entity';
import { PaginationService } from 'src/shared/services/pagination/pagination.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Tweet,
            TweetLike,
            TweetRepost,
            TweetQuote,
            TweetReply,
            Hashtag,
            UserFollows,
        ]),
    ],
    controllers: [TweetsController],
    providers: [TweetsService, PaginationService],
    exports: [TweetsService],
})
export class TweetsModule {}

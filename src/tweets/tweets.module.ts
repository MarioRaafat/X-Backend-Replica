import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TweetsController } from './tweets.controller';
import { TweetsService } from './tweets.service';
import { TweetsRepository } from './tweets.repository';
import { ReplyRestrictionService } from './services/reply-restriction.service';
import { Tweet, TweetLike, TweetQuote, TweetReply, TweetRepost } from './entities';
import { TweetBookmark } from './entities/tweet-bookmark.entity';
import { Hashtag } from './entities/hashtags.entity';
import { UserFollows } from 'src/user/entities/user-follows.entity';
import { UserBlocks } from 'src/user/entities/user-blocks.entity';
import { User } from 'src/user/entities/user.entity';
import { PaginationService } from 'src/shared/services/pagination/pagination.service';
import { AzureStorageService } from 'src/azure-storage/azure-storage.service';
import { UserPostsView } from './entities/user-posts-view.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Tweet,
            TweetLike,
            TweetRepost,
            TweetQuote,
            TweetReply,
            TweetBookmark,
            Hashtag,
            UserFollows,
            UserBlocks,
            User,
            UserPostsView,
        ]),
    ],
    controllers: [TweetsController],
    providers: [
        TweetsService,
        TweetsRepository,
        ReplyRestrictionService,
        PaginationService,
        AzureStorageService,
    ],
    exports: [TweetsService, TweetsRepository, ReplyRestrictionService],
})
export class TweetsModule {}

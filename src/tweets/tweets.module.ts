import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TweetsController } from './tweets.controller';
import { TweetsService } from './tweets.service';
import { TweetsRepository } from './tweets.repository';
import { Tweet, TweetLike, TweetQuote, TweetReply, TweetRepost } from './entities';
import { TweetBookmark } from './entities/tweet-bookmark.entity';
import { Hashtag } from './entities/hashtags.entity';
import { UserFollows } from 'src/user/entities/user-follows.entity';
import { PaginationService } from 'src/shared/services/pagination/pagination.service';
import { AzureStorageService } from 'src/azure-storage/azure-storage.service';
import { UserPostsView } from './entities/user-posts-view.entity';
import { TweetCategory } from './entities/tweet-category.entity';
import { TweetSummary } from './entities/tweet-summary.entity';
import { BackgroundJobsModule } from 'src/background-jobs';
import { ReplyJobService } from 'src/background-jobs/notifications/reply/reply.service';

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
            UserPostsView,
            TweetCategory,
            TweetSummary,
        ]),
        BackgroundJobsModule,
    ],
    controllers: [TweetsController],
    providers: [TweetsService, TweetsRepository, PaginationService, AzureStorageService],
    exports: [TweetsService, TweetsRepository],
})
export class TweetsModule {}

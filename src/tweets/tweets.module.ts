import { forwardRef, Module } from '@nestjs/common';
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
import { HashtagJobService } from 'src/background-jobs/hashtag/hashtag.service';
import { User } from 'src/user/entities';
import { DeletedTweetsCleanupService, DeletedTweetsLog } from './deleted-tweets-cleanup.service';

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
            User,
            DeletedTweetsLog,
        ]),
        BackgroundJobsModule,
    ],
    controllers: [TweetsController],
    providers: [
        TweetsService,
        TweetsRepository,
        PaginationService,
        AzureStorageService,
        HashtagJobService,
        DeletedTweetsCleanupService,
    ],
    exports: [TweetsService, TweetsRepository],
})
export class TweetsModule {}

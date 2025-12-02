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
import { BackgroundJobsModule } from 'src/background-jobs';
import { ReplyJobService } from 'src/background-jobs/notifications/reply/reply.service';
import { TrendService } from 'src/trend/trend.service';

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
        ]),
        BackgroundJobsModule,
    ],
    controllers: [TweetsController],
    providers: [
        TweetsService,
        TweetsRepository,
        PaginationService,
        AzureStorageService,
        TrendService,
    ],
    exports: [TweetsService, TweetsRepository],
})
export class TweetsModule {}

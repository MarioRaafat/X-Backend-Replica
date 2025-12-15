import { forwardRef, Module } from '@nestjs/common';
import { TimelineService } from './timeline.service';
import { TimelineController } from './timeline.controller';
import { TweetsRepository } from 'src/tweets/tweets.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tweet, TweetLike, TweetRepost } from 'src/tweets/entities';
import { PaginationService } from 'src/shared/services/pagination/pagination.service';
import { UserPostsView } from 'src/tweets/entities/user-posts-view.entity';
import { TweetCategory } from 'src/tweets/entities/tweet-category.entity';
import { ForyouService } from './services/foryou/for-you.service';
import { InterestsCandidateSource } from './services/foryou/canditate-sources/interests-source';
import { UserInterests } from 'src/user/entities/user-interests.entity';
import { UserTimelineCursor } from 'src/user/entities/user-timeline-cursor.entity';
import { TimelineRedisService } from './services/timeline-redis.service';
import { TimelineCandidatesService } from './services/timeline-candidates.service';
import { BackgroundJobsModule } from 'src/background-jobs/background-jobs.module';
import { RedisModuleConfig } from 'src/redis/redis.module';
import { Category } from 'src/category/entities';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Tweet,
            TweetLike,
            TweetRepost,
            UserPostsView,
            TweetCategory,
            UserInterests,
            UserTimelineCursor,
            Category,
        ]),
        forwardRef(() => BackgroundJobsModule),
        RedisModuleConfig,
    ],
    controllers: [TimelineController],
    providers: [
        TimelineService,
        TweetsRepository,
        PaginationService,
        ForyouService,
        InterestsCandidateSource,
        TimelineRedisService,
        TimelineCandidatesService,
    ],
    exports: [TimelineRedisService, TimelineCandidatesService],
})
export class TimelineModule {}

import { Module } from '@nestjs/common';
import { TimelineService } from './timeline.service';
import { TimelineController } from './timeline.controller';
import { TweetsRepository } from 'src/tweets/tweets.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tweet, TweetLike, TweetRepost } from 'src/tweets/entities';
import { PaginationService } from 'src/shared/services/pagination/pagination.service';
import { UserPostsView } from 'src/tweets/entities/user-posts-view.entity';
import { TweetCategory } from 'src/tweets/entities/tweet-category.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Tweet, TweetLike, TweetRepost, UserPostsView, TweetCategory]),
    ],
    controllers: [TimelineController],
    providers: [TimelineService, TweetsRepository, PaginationService],
})
export class TimelineModule {}

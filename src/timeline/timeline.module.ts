import { Module } from '@nestjs/common';
import { TimelineService } from './timeline.service';
import { TimelineController } from './timeline.controller';
import { TweetsRepository } from 'src/tweets/tweets.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tweet, TweetLike, TweetRepost } from 'src/tweets/entities';
import { PaginationService } from 'src/shared/services/pagination/pagination.service';
import { UserPostsView } from 'src/tweets/entities/user-posts-view.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Tweet, TweetLike, TweetRepost, UserPostsView])],
    controllers: [TimelineController],
    providers: [TimelineService, TweetsRepository, PaginationService],
})
export class TimelineModule {}

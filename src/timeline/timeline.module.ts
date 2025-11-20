import { Module } from '@nestjs/common';
import { TimelineService } from './timeline.service';
import { TimelineController } from './timeline.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tweet, TweetLike, TweetRepost } from 'src/tweets/entities';
import { PaginationService } from 'src/shared/services/pagination/pagination.service';
import { TweetsModule } from 'src/tweets/tweets.module';

@Module({
    imports: [TypeOrmModule.forFeature([Tweet, TweetLike, TweetRepost]), TweetsModule],
    controllers: [TimelineController],
    providers: [TimelineService, PaginationService],
})
export class TimelineModule {}

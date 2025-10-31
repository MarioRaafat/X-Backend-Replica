import { Module } from '@nestjs/common';
import { TimelineService } from './timeline.service';
import { TimelineController } from './timeline.controller';
import { TweetsRepository } from 'src/tweets/tweets.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tweet, TweetLike, TweetRepost } from 'src/tweets/entities';

@Module({
    imports: [TypeOrmModule.forFeature([Tweet, TweetLike, TweetRepost])],
    controllers: [TimelineController],
    providers: [TimelineService, TweetsRepository],
})
export class TimelineModule {}

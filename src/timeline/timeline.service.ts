import { Injectable } from '@nestjs/common';
import { TimelinePaginationDto } from './dto/timeline-pagination.dto';
import { TweetsRepository } from 'src/tweets/tweets.repository';
import { TimelineResponseDto } from './dto/timeline-response.dto';
import { TweetResponseDTO } from 'src/tweets/dto/tweet-response.dto';

@Injectable()
export class TimelineService {
    constructor(private readonly tweet_repository: TweetsRepository) {}
    async getFollowingTimeline(
        user_id: string,
        pagination: TimelinePaginationDto
    ): Promise<TimelineResponseDto> {
        // tweets

        const { tweets, next_cursor } = await this.tweet_repository.getFollowingTweets(
            user_id,
            pagination
        );

        //prepare response data

        //TODO: Uncomment after choosing one approach in all responses
        // const tweet_ids = tweets.map((t) => t.tweet_id);
        // const { liked_tweet_ids, reposted_tweet_ids } =
        //     await this.tweet_repository.checkUserInteractions(user_id, tweet_ids);

        return {
            tweets,
            next_cursor,
            has_more: tweets.length === pagination.limit,
            timestamp: new Date().toISOString(),
        };
        // quotes
        // reposts
        // replies
    }
}

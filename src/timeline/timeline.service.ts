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
    ): Promise<{
        data: TweetResponseDTO[];
        pagination: { next_cursor: string | null; has_more: boolean };
    }> {
        return await this.tweet_repository.getFollowingTweets(
            user_id,
            pagination.cursor,
            pagination.limit
        );
    }
    // async getForyouTimeline(
    //     user_id: string,
    //     pagination: TimelinePaginationDto
    // ): Promise<{
    //     data: TweetResponseDTO[];
    //     pagination: { next_cursor: string | null; has_more: boolean };
    // }> {
    //     return await this.tweet_repository.getForyouTweets(
    //         user_id,
    //         pagination.cursor,
    //         pagination.limit
    //     );
    // }
}

import { ApiProperty } from '@nestjs/swagger';
import { PaginationMeta } from './pagination-meta';

export class TimelineResponseDto {
  //TODO: Uncomment after tweet implementation
  //   @ApiProperty({
  //     type: [TweetDto],
  //     description: 'List of tweets in timeline',
  //   })
  //   tweets: [TweetDto];

  @ApiProperty({
    description: 'Pagiantion metadata',
  })
  pagination: PaginationMeta;

  @ApiProperty({
    example: '2024-01-15T10:35:00Z',
    description: 'Feed was fetched/generated at 10:35',
  })
  timestamp: string;
}

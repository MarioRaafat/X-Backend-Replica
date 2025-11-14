import { TimelineResponseDto } from './timeline-response.dto';
import { TweetResponseDTO } from 'src/tweets/dto';

describe('TimelineResponseDto', () => {
    it('should be defined', () => {
        expect(TimelineResponseDto).toBeDefined();
    });

    it('should create an instance', () => {
        const dto = new TimelineResponseDto();
        expect(dto).toBeInstanceOf(TimelineResponseDto);
    });

    it('should have all required properties', () => {
        const dto = new TimelineResponseDto();
        dto.tweets = [];
        dto.next_cursor = null;
        dto.has_more = false;
        dto.count = 0;
        dto.timestamp = new Date().toISOString();

        expect(dto.tweets).toBeDefined();
        expect(dto.next_cursor).toBeNull();
        expect(dto.has_more).toBe(false);
        expect(dto.count).toBe(0);
        expect(dto.timestamp).toBeDefined();
    });

    it('should accept array of tweets', () => {
        const dto = new TimelineResponseDto();
        const mock_tweet = {
            tweet_id: '550e8400-e29b-41d4-a716-446655440000',
            content: 'Test tweet',
            type: 'tweet',
            images: [],
            videos: [],
        } as unknown as TweetResponseDTO;

        dto.tweets = [mock_tweet];
        dto.next_cursor = '550e8400-e29b-41d4-a716-446655440001';
        dto.has_more = true;
        dto.count = 1;
        dto.timestamp = '2024-01-15T10:35:00Z';

        expect(dto.tweets).toHaveLength(1);
        expect(dto.tweets[0]).toEqual(mock_tweet);
        expect(dto.next_cursor).toBe('550e8400-e29b-41d4-a716-446655440001');
    });

    it('should handle empty timeline', () => {
        const dto = new TimelineResponseDto();
        dto.tweets = [];
        dto.next_cursor = null;
        dto.has_more = false;
        dto.count = 0;
        dto.timestamp = new Date().toISOString();

        expect(dto.tweets).toHaveLength(0);
        expect(dto.has_more).toBe(false);
        expect(dto.next_cursor).toBeNull();
    });

    it('should handle timeline with pagination', () => {
        const dto = new TimelineResponseDto();
        const mock_tweets = [
            {
                tweet_id: '1',
                content: 'Tweet 1',
                type: 'tweet',
                images: [],
                videos: [],
            } as unknown as TweetResponseDTO,
            {
                tweet_id: '2',
                content: 'Tweet 2',
                type: 'tweet',
                images: [],
                videos: [],
            } as unknown as TweetResponseDTO,
        ];

        dto.tweets = mock_tweets;
        dto.next_cursor = 'cursor-token-123';
        dto.has_more = true;
        dto.count = 100;
        dto.timestamp = '2024-01-15T10:35:00Z';

        expect(dto.tweets).toHaveLength(2);
        expect(dto.has_more).toBe(true);
        expect(dto.count).toBe(100);
        expect(dto.timestamp).toContain('T');
    });

    it('should handle last page of timeline', () => {
        const dto = new TimelineResponseDto();
        dto.tweets = [
            {
                tweet_id: '1',
                content: 'Last tweet',
                type: 'tweet',
                images: [],
                videos: [],
            } as unknown as TweetResponseDTO,
        ];
        dto.next_cursor = null;
        dto.has_more = false;
        dto.count = 1;
        dto.timestamp = new Date().toISOString();

        expect(dto.has_more).toBe(false);
        expect(dto.next_cursor).toBeNull();
    });
});

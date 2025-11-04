import { TweetType } from './tweet-types.enum';

describe('TweetType Enum', () => {
    it('should have TWEET value', () => {
        expect(TweetType.TWEET).toBe('tweet');
    });

    it('should have REPLY value', () => {
        expect(TweetType.REPLY).toBe('reply');
    });

    it('should have QUOTE value', () => {
        expect(TweetType.QUOTE).toBe('quote');
    });

    it('should have exactly 3 tweet types', () => {
        const types = Object.values(TweetType);
        expect(types).toHaveLength(3);
        expect(types).toContain('tweet');
        expect(types).toContain('reply');
        expect(types).toContain('quote');
    });

    it('should be usable as object keys', () => {
        const tweet_counts = {
            [TweetType.TWEET]: 10,
            [TweetType.REPLY]: 5,
            [TweetType.QUOTE]: 3,
        };

        expect(tweet_counts[TweetType.TWEET]).toBe(10);
        expect(tweet_counts[TweetType.REPLY]).toBe(5);
        expect(tweet_counts[TweetType.QUOTE]).toBe(3);
    });

    it('should support comparison', () => {
        const tweet_type: TweetType = TweetType.TWEET;
        expect(tweet_type).toBe(TweetType.TWEET);
        expect(tweet_type).not.toBe(TweetType.REPLY);
        expect(tweet_type).not.toBe(TweetType.QUOTE);
    });
});

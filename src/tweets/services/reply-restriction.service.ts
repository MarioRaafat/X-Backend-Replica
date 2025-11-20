import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tweet } from '../entities/tweet.entity';
import { TweetReply } from '../entities/tweet-reply.entity';
import { User } from '../../user/entities/user.entity';
import { UserFollows } from '../../user/entities/user-follows.entity';
import { UserBlocks } from '../../user/entities/user-blocks.entity';
import { ReplyRestriction } from '../../shared/enums/reply-restriction.enum';

@Injectable()
export class ReplyRestrictionService {
    constructor(
        @InjectRepository(Tweet)
        private readonly tweet_repository: Repository<Tweet>,
        @InjectRepository(TweetReply)
        private readonly tweet_reply_repository: Repository<TweetReply>,
        @InjectRepository(User)
        private readonly user_repository: Repository<User>,
        @InjectRepository(UserFollows)
        private readonly user_follows_repository: Repository<UserFollows>,
        @InjectRepository(UserBlocks)
        private readonly user_blocks_repository: Repository<UserBlocks>
    ) {}

    /**
     * Validates if a user has permission to reply to a tweet based on conversation-level restrictions.
     *
     * Reply restrictions are inherited from the conversation root tweet. When replying to any tweet
     * in a conversation thread, the restrictions set by the original tweet author apply to the entire thread.
     *
     * Validation process:
     * 1. Looks up the conversation_id from the TweetReply table to find the root tweet
     * 2. Checks if either user has blocked the other (bidirectional block check)
     * 3. Applies the root tweet's reply_restriction rules:
     *    - EVERYONE: Anyone can reply (no restrictions)
     *    - MENTIONED: Only users mentioned in the root tweet can reply
     *    - VERIFIED: Only verified users or mentioned users can reply
     *    - FOLLOWED: Only users followed by the root tweet author or mentioned users can reply
     *
     * @param original_tweet_id - The ID of the tweet being replied to (can be root or nested reply)
     * @param replying_user_id - The ID of the user attempting to reply
     * @throws {ForbiddenException} If the user doesn't have permission to reply based on restrictions or blocks
     * @throws {NotFoundException} If the tweet or conversation root is not found
     */
    async validateReplyPermission(
        original_tweet_id: string,
        replying_user_id: string
    ): Promise<void> {
        const original_tweet = await this.tweet_repository.findOne({
            where: { tweet_id: original_tweet_id },
            select: ['tweet_id', 'user_id'],
        });

        if (!original_tweet) {
            throw new ForbiddenException('Tweet not found');
        }

        const reply_info = await this.tweet_reply_repository.findOne({
            where: { reply_tweet_id: original_tweet_id },
            select: ['conversation_id'],
        });

        const root_tweet_id = reply_info?.conversation_id || original_tweet_id;
        const root_tweet = await this.tweet_repository.findOne({
            where: { tweet_id: root_tweet_id },
            select: ['tweet_id', 'user_id', 'reply_restriction', 'mentions'],
        });

        if (!root_tweet) {
            throw new ForbiddenException('Conversation root tweet not found');
        }

        const root_author_id = root_tweet.user_id;

        const is_blocked = await this.user_blocks_repository.exists({
            where: [
                { blocker_id: root_author_id, blocked_id: replying_user_id },
                { blocker_id: replying_user_id, blocked_id: root_author_id },
            ],
        });

        if (is_blocked) {
            throw new ForbiddenException('You cannot reply to this conversation');
        }

        const is_mentioned = root_tweet.mentions?.includes(replying_user_id) || false;

        switch (root_tweet.reply_restriction) {
            case ReplyRestriction.EVERYONE:
                return;

            case ReplyRestriction.MENTIONED:
                if (!is_mentioned) {
                    throw new ForbiddenException(
                        'Only users mentioned in this conversation can reply'
                    );
                }
                return;

            case ReplyRestriction.VERIFIED:
                if (!is_mentioned) {
                    const replying_user = await this.user_repository.findOne({
                        where: { id: replying_user_id },
                        select: ['verified'],
                    });

                    if (!replying_user?.verified) {
                        throw new ForbiddenException(
                            'Only verified users or mentioned users can reply to this conversation'
                        );
                    }
                }
                return;

            case ReplyRestriction.FOLLOWED:
                if (!is_mentioned) {
                    const is_followed = await this.user_follows_repository.exists({
                        where: {
                            follower_id: root_author_id,
                            followed_id: replying_user_id,
                        },
                    });

                    if (!is_followed) {
                        throw new ForbiddenException(
                            'Only users followed by the conversation author or mentioned users can reply'
                        );
                    }
                }
                return;

            default:
                throw new ForbiddenException('Invalid reply restriction setting');
        }
    }

    /**
     * Checks if a user can reply to a tweet without throwing exceptions (safe version).
     *
     * This is a non-throwing wrapper around validateReplyPermission, used primarily for
     * populating the can_reply boolean field in tweet responses. It inherits the same
     * conversation-level restriction logic from the root tweet.
     *
     * Use cases:
     * - Determining the can_reply field value for TweetResponseDTO
     * - Client-side UI decisions (show/hide reply button)
     * - Batch permission checking for multiple tweets
     *
     * @param original_tweet_id - The ID of the tweet to check reply permission for
     * @param replying_user_id - The ID of the user attempting to reply (null for anonymous users)
     * @returns {Promise<boolean>} true if the user can reply, false if denied or anonymous
     */
    async canReply(original_tweet_id: string, replying_user_id: string | null): Promise<boolean> {
        if (!replying_user_id) {
            return false;
        }

        try {
            await this.validateReplyPermission(original_tweet_id, replying_user_id);
            return true;
        } catch {
            return false;
        }
    }
}

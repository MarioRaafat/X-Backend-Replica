import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddConversationIdToTweets1730356800000 implements MigrationInterface {
    public async up(query_runner: QueryRunner): Promise<void> {
        // Add conversation_id column (nullable - only used for replies)
        await query_runner.addColumn(
            'tweets',
            new TableColumn({
                name: 'conversation_id',
                type: 'uuid',
                isNullable: true,
            })
        );

        // Set conversation_id for replies based on their parent tweet's conversation_id
        // This handles multi-level reply chains
        await query_runner.query(`
            WITH RECURSIVE reply_chain AS (
                -- Base case: direct replies to root tweets
                SELECT 
                    tr.reply_tweet_id,
                    COALESCE(t_parent.conversation_id, tr.original_tweet_id) as conversation_id
                FROM tweet_replies tr
                LEFT JOIN tweets t_parent ON t_parent.tweet_id = tr.original_tweet_id
                WHERE tr.original_tweet_id NOT IN (SELECT reply_tweet_id FROM tweet_replies)
                
                UNION ALL
                
                -- Recursive case: replies to replies
                SELECT 
                    tr.reply_tweet_id,
                    rc.conversation_id
                FROM tweet_replies tr
                INNER JOIN reply_chain rc ON tr.original_tweet_id = rc.reply_tweet_id
            )
            UPDATE tweets t
            SET conversation_id = rc.conversation_id
            FROM reply_chain rc
            WHERE t.tweet_id = rc.reply_tweet_id
        `);
    }

    public async down(query_runner: QueryRunner): Promise<void> {
        await query_runner.dropColumn('tweets', 'conversation_id');
    }
}

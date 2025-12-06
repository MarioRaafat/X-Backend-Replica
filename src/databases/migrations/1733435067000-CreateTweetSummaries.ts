import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTweetSummaries1733435067000 implements MigrationInterface {
    name = 'CreateTweetSummaries1733435067000';

    public async up(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(
            `CREATE TABLE "tweet_summaries" (
                "tweet_id" uuid NOT NULL,
                "summary" text NOT NULL,
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_tweet_summaries" PRIMARY KEY ("tweet_id")
            )`
        );

        await query_runner.query(
            `ALTER TABLE "tweet_summaries" 
            ADD CONSTRAINT "FK_tweet_summaries_tweet_id" 
            FOREIGN KEY ("tweet_id") 
            REFERENCES "tweets"("tweet_id") 
            ON DELETE CASCADE 
            ON UPDATE NO ACTION`
        );
    }

    public async down(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(
            `ALTER TABLE "tweet_summaries" DROP CONSTRAINT "FK_tweet_summaries_tweet_id"`
        );

        await query_runner.query(`DROP TABLE "tweet_summaries"`);
    }
}

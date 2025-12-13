import { MigrationInterface, QueryRunner } from 'typeorm';

export class TweetHashtagEntity1765585636405 implements MigrationInterface {
    name = 'TweetHashtagEntity1765585636405';

    public async up(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(
            `CREATE TABLE "tweet_hashtags" ("tweet_id" uuid NOT NULL, "hashtag_name" character varying NOT NULL, CONSTRAINT "PK_42219b0e52e3bee49d2772b3a54" PRIMARY KEY ("tweet_id", "hashtag_name"))`
        );

        await query_runner.query(
            `ALTER TABLE "tweet_hashtags" ADD CONSTRAINT "FK_efe191c9c3d1359e60bac167736" FOREIGN KEY ("tweet_id") REFERENCES "tweets"("tweet_id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await query_runner.query(
            `ALTER TABLE "tweet_hashtags" ADD CONSTRAINT "FK_b0a40275de4a8088c5e6426419d" FOREIGN KEY ("hashtag_name") REFERENCES "hashtag"("name") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
    }

    public async down(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(
            `ALTER TABLE "tweet_hashtags" DROP CONSTRAINT "FK_b0a40275de4a8088c5e6426419d"`
        );
        await query_runner.query(
            `ALTER TABLE "tweet_hashtags" DROP CONSTRAINT "FK_efe191c9c3d1359e60bac167736"`
        );

        await query_runner.query(`DROP TABLE "tweet_hashtags"`);
    }
}

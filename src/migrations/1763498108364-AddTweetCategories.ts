import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTweetCategories1763498108364 implements MigrationInterface {
    name = 'AddTweetCategories1763498108364';

    public async up(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(
            `CREATE TABLE "tweet_categories" ("tweet_id" uuid NOT NULL, "category_id" smallint NOT NULL, "percentage" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_971fcf9897bf9c05a94df12b9b8" PRIMARY KEY ("tweet_id", "category_id"))`
        );
        await query_runner.query(
            `CREATE INDEX "IDX_CATEGORY" ON "tweet_categories" ("category_id") `
        );
        await query_runner.query(
            `ALTER TABLE "tweet_categories" ADD CONSTRAINT "FK_2b4ee6b36f719addb2be60efdd3" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await query_runner.query(
            `ALTER TABLE "tweet_categories" ADD CONSTRAINT "FK_c5786e021a586ae7fd93ee65c0e" FOREIGN KEY ("tweet_id") REFERENCES "tweets"("tweet_id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
    }

    public async down(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(
            `ALTER TABLE "tweet_categories" DROP CONSTRAINT "FK_c5786e021a586ae7fd93ee65c0e"`
        );
        await query_runner.query(
            `ALTER TABLE "tweet_categories" DROP CONSTRAINT "FK_2b4ee6b36f719addb2be60efdd3"`
        );
        await query_runner.query(`DROP INDEX "public"."IDX_CATEGORY"`);
        await query_runner.query(`DROP TABLE "tweet_categories"`);
    }
}

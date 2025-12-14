import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHashtagCreatedAt1765743134688 implements MigrationInterface {
    name = 'AddHashtagCreatedAt1765743134688';

    public async up(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(`ALTER TABLE "hashtag" ADD "category" character varying`);
        await query_runner.query(
            `ALTER TABLE "tweet_hashtags" ADD "tweet_created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`
        );
    }

    public async down(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(`ALTER TABLE "tweet_hashtags" DROP COLUMN "tweet_created_at"`);
        await query_runner.query(`ALTER TABLE "hashtag" DROP COLUMN "category"`);
    }
}

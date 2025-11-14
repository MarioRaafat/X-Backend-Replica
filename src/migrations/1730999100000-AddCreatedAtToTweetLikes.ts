import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCreatedAtToTweetLikes1730999100000 implements MigrationInterface {
    public async up(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(`
            ALTER TABLE "tweet_likes" 
            ADD COLUMN "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
        `);
    }

    public async down(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(`
            ALTER TABLE "tweet_likes" 
            DROP COLUMN "created_at"
        `);
    }
}

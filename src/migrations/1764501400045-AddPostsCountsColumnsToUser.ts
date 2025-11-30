import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPostsCountsColumnsToUser1764501400045 implements MigrationInterface {
    name = 'AddPostsCountsColumnsToUser1764501400045';

    public async up(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(`ALTER TABLE "user" ADD "num_posts" integer NOT NULL DEFAULT '0'`);
        await query_runner.query(
            `ALTER TABLE "user" ADD "num_replies" integer NOT NULL DEFAULT '0'`
        );
        await query_runner.query(`ALTER TABLE "user" ADD "num_media" integer NOT NULL DEFAULT '0'`);
        await query_runner.query(`ALTER TABLE "user" ADD "num_likes" integer NOT NULL DEFAULT '0'`);
    }

    public async down(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(`ALTER TABLE "user" DROP COLUMN "num_likes"`);
        await query_runner.query(`ALTER TABLE "user" DROP COLUMN "num_media"`);
        await query_runner.query(`ALTER TABLE "user" DROP COLUMN "num_replies"`);
        await query_runner.query(`ALTER TABLE "user" DROP COLUMN "num_posts"`);
    }
}

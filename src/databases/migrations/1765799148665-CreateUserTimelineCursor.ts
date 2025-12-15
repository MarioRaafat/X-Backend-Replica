import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserTimelineCursor1765799148665 implements MigrationInterface {
    name = 'CreateUserTimelineCursor1765799148665';

    public async up(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(
            `CREATE TABLE "user_timeline_cursors" ("user_id" uuid NOT NULL, "last_fetched_tweet_id" uuid, "last_updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_3ba26dbd089693ecd14cf188a19" PRIMARY KEY ("user_id"))`
        );
        await query_runner.query(
            `ALTER TABLE "user_timeline_cursors" ADD CONSTRAINT "FK_3ba26dbd089693ecd14cf188a19" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
    }

    public async down(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(
            `ALTER TABLE "user_timeline_cursors" DROP CONSTRAINT "FK_3ba26dbd089693ecd14cf188a19"`
        );
        await query_runner.query(`DROP TABLE "user_timeline_cursors"`);
    }
}

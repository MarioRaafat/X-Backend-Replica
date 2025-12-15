import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPositionToUserTimelineCursor1765823235580 implements MigrationInterface {
    public async up(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(`
            ALTER TABLE "user_timeline_cursors" 
            ADD COLUMN "last_fetched_position" integer NOT NULL DEFAULT 0
        `);
    }

    public async down(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(`
            ALTER TABLE "user_timeline_cursors" 
            DROP COLUMN "last_fetched_position"
        `);
    }
}

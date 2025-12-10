import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserFollowsIndexes1764891130571 implements MigrationInterface {
    public async up(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(`
            CREATE INDEX IF NOT EXISTS idx_user_follows_followed_follower 
            ON user_follows(followed_id, follower_id)
        `);
    }

    public async down(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(`DROP INDEX IF EXISTS idx_user_follows_followed_follower`);
    }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveUserTrigramIndexes1765402793921 implements MigrationInterface {
    public async up(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(`DROP INDEX IF EXISTS user_username_trgm_idx`);

        await query_runner.query(`DROP INDEX IF EXISTS user_name_trgm_idx`);

        await query_runner.query(`DROP EXTENSION IF EXISTS pg_trgm`);
    }

    public async down(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

        await query_runner.query(`
            CREATE INDEX user_username_trgm_idx 
            ON "user" 
            USING GIN (username gin_trgm_ops)
        `);

        await query_runner.query(`
            CREATE INDEX user_name_trgm_idx 
            ON "user" 
            USING GIN (name gin_trgm_ops)
        `);
    }
}

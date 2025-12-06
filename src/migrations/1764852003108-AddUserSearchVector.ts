import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserSearchVector1764852003108 implements MigrationInterface {
    public async up(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(`
            ALTER TABLE "user" 
            ADD COLUMN search_vector tsvector 
            GENERATED ALWAYS AS (
                setweight(to_tsvector('simple', coalesce(username, '')), 'A') ||
                setweight(to_tsvector('simple', coalesce(name, '')), 'B')
            ) STORED
        `);

        await query_runner.query(`
            CREATE INDEX user_search_vector_idx 
            ON "user" 
            USING GIN (search_vector)
        `);

        await query_runner.query(`
            CREATE EXTENSION IF NOT EXISTS pg_trgm
        `);

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

    public async down(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(`DROP INDEX IF EXISTS user_name_trgm_idx`);
        await query_runner.query(`DROP INDEX IF EXISTS user_username_trgm_idx`);
        await query_runner.query(`DROP INDEX IF EXISTS user_search_vector_idx`);
        await query_runner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS search_vector`);
    }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserSearchVectorV21764852003108 implements MigrationInterface {
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
    }

    public async down(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(`DROP INDEX IF EXISTS user_search_vector_idx`);
        await query_runner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS search_vector`);
    }
}

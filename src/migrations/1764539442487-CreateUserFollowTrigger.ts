import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserFollowTrigger1764539442487 implements MigrationInterface {
    public async up(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(`
                CREATE OR REPLACE FUNCTION increment_follow_counts()
                RETURNS TRIGGER AS $$
                BEGIN
                    -- Increment following for the follower
                    UPDATE "user" 
                    SET following = following + 1
                    WHERE id = NEW.follower_id;
                    
                    -- Increment followers for the followed user
                    UPDATE "user" 
                    SET followers = followers + 1
                    WHERE id = NEW.followed_id;
                    
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;
            `);

        await query_runner.query(`
                CREATE OR REPLACE FUNCTION decrement_follow_counts()
                RETURNS TRIGGER AS $$
                BEGIN
                    -- Decrement following for the follower
                    UPDATE "user" 
                    SET following = GREATEST(following - 1, 0)
                    WHERE id = OLD.follower_id;
                    
                    -- Decrement followers for the followed user
                    UPDATE "user" 
                    SET followers = GREATEST(followers - 1, 0)
                    WHERE id = OLD.followed_id;
                    
                    RETURN OLD;
                END;
                $$ LANGUAGE plpgsql;
            `);

        await query_runner.query(`
                CREATE TRIGGER follow_insert_trigger
                AFTER INSERT ON user_follows
                FOR EACH ROW
                EXECUTE FUNCTION increment_follow_counts();
            `);

        await query_runner.query(`
                CREATE TRIGGER follow_delete_trigger
                AFTER DELETE ON user_follows
                FOR EACH ROW
                EXECUTE FUNCTION decrement_follow_counts();
            `);
    }

    public async down(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(`DROP TRIGGER IF EXISTS follow_insert_trigger ON user_follows;`);
        await query_runner.query(`DROP TRIGGER IF EXISTS follow_delete_trigger ON user_follows;`);
        await query_runner.query(`DROP FUNCTION IF EXISTS increment_follow_counts();`);
        await query_runner.query(`DROP FUNCTION IF EXISTS decrement_follow_counts();`);
    }
}

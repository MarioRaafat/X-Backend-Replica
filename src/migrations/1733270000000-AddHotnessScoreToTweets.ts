import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddHotnessScoreToTweets1733270000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add hotness_score column
        await queryRunner.addColumn(
            'tweets',
            new TableColumn({
                name: 'hotness_score',
                type: 'double precision',
                default: 0,
            })
        );

        // Initialize hotness_score for existing tweets (last 7 days only)
        await queryRunner.query(`
            UPDATE tweets
            SET hotness_score = (
                (num_likes * 1 + num_reposts * 10 + num_quotes * 20 + num_replies * 30)::numeric
                / POWER(
                    EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 + 2,
                    1.8
                )
            )
            WHERE created_at > NOW() - INTERVAL '7 days'
            AND deleted_at IS NULL;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop column
        await queryRunner.dropColumn('tweets', 'hotness_score');
    }
}

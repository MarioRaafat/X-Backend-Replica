import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixBlockMute1765826464278 implements MigrationInterface {
    name = 'FixBlockMute1765826464278';

    public async up(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(
            `ALTER TABLE "user_blocks" ADD CONSTRAINT "FK_dfcd8a81016d1de587fbd2d70bf" FOREIGN KEY ("blocker_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await query_runner.query(
            `ALTER TABLE "user_blocks" ADD CONSTRAINT "FK_7a0806a54f0ad9ced3e247cacd1" FOREIGN KEY ("blocked_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await query_runner.query(
            `ALTER TABLE "user_mutes" ADD CONSTRAINT "FK_3c5a99ffecb6ebcfa39c0ec89e3" FOREIGN KEY ("muter_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await query_runner.query(
            `ALTER TABLE "user_mutes" ADD CONSTRAINT "FK_0574bdce9d2af99028b0e6f9ba5" FOREIGN KEY ("muted_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
    }

    public async down(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(
            `ALTER TABLE "user_mutes" DROP CONSTRAINT "FK_0574bdce9d2af99028b0e6f9ba5"`
        );
        await query_runner.query(
            `ALTER TABLE "user_mutes" DROP CONSTRAINT "FK_3c5a99ffecb6ebcfa39c0ec89e3"`
        );
        await query_runner.query(
            `ALTER TABLE "user_blocks" DROP CONSTRAINT "FK_7a0806a54f0ad9ced3e247cacd1"`
        );
        await query_runner.query(
            `ALTER TABLE "user_blocks" DROP CONSTRAINT "FK_dfcd8a81016d1de587fbd2d70bf"`
        );
    }
}

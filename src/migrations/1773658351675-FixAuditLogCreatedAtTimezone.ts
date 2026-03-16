import { MigrationInterface, QueryRunner } from "typeorm";

export class FixAuditLogCreatedAtTimezone1773658351675 implements MigrationInterface {
    name = 'FixAuditLogCreatedAtTimezone1773658351675'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
    }

}

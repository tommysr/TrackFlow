import { MigrationInterface, QueryRunner } from "typeorm";

export class SchemaUpdate1737989576852 implements MigrationInterface {
    name = 'SchemaUpdate1737989576852'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "route_stop" DROP COLUMN "plannedArrival"`);
        await queryRunner.query(`ALTER TABLE "shipment" DROP COLUMN "eta"`);
        await queryRunner.query(`ALTER TABLE "shipment" DROP COLUMN "lastRouteSegment"`);
        await queryRunner.query(`ALTER TABLE "shipment" DROP COLUMN "hashedSecret"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "shipment" ADD "hashedSecret" text`);
        await queryRunner.query(`ALTER TABLE "shipment" ADD "lastRouteSegment" jsonb`);
        await queryRunner.query(`ALTER TABLE "shipment" ADD "eta" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "route_stop" ADD "plannedArrival" TIMESTAMP WITH TIME ZONE`);
    }

}

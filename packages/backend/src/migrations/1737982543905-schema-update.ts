import { MigrationInterface, QueryRunner } from "typeorm";

export class SchemaUpdate1737982543905 implements MigrationInterface {
    name = 'SchemaUpdate1737982543905'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "icp_user" ("principal" character varying NOT NULL, "roles" text NOT NULL DEFAULT '["USER"]', "name" character varying, "contact" character varying, CONSTRAINT "PK_77a25d49764bed0fbc06b0f7c65" PRIMARY KEY ("principal"))`);
        await queryRunner.query(`CREATE TYPE "public"."route_stop_stoptype_enum" AS ENUM('PICKUP', 'DELIVERY', 'START', 'END')`);
        await queryRunner.query(`CREATE TABLE "route_stop" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "shipmentId" uuid, "stopType" "public"."route_stop_stoptype_enum" NOT NULL, "sequenceIndex" integer NOT NULL, "location" geometry(Point,4326) NOT NULL, "plannedArrival" TIMESTAMP WITH TIME ZONE, "estimatedArrival" TIMESTAMP WITH TIME ZONE, "actualArrival" TIMESTAMP WITH TIME ZONE, "routeId" uuid, CONSTRAINT "PK_bae45354739f262bfdc6f830f70" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "route_segment" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "path" geometry(LineString,4326) NOT NULL, "distance" numeric(10,2) NOT NULL, "duration" numeric(10,2) NOT NULL, "routeId" uuid, "fromStopId" uuid, "toStopId" uuid, CONSTRAINT "PK_e542ad85f49f265cbd0bd855e12" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "route_metrics" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "completedStops" integer NOT NULL, "totalStops" integer NOT NULL, "completedDistance" numeric(10,2) NOT NULL, "remainingDistance" numeric(10,2) NOT NULL, "isDelayed" boolean NOT NULL, "delayMinutes" integer, "routeId" uuid, CONSTRAINT "REL_62202da731e99f7a24fea865bd" UNIQUE ("routeId"), CONSTRAINT "PK_26da61e1617b0bf6057a7a76c31" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "route_distance_matrix" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "durations" double precision array NOT NULL, "distances" double precision array NOT NULL, "routeId" uuid, CONSTRAINT "REL_bfeb7efb9b9dc48027555d4f5c" UNIQUE ("routeId"), CONSTRAINT "PK_661b035ef3f171705eedf04e8ba" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."shipment_route_history_operationtype_enum" AS ENUM('PICKUP', 'DELIVERY', 'FAILED')`);
        await queryRunner.query(`CREATE TABLE "shipment_route_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "operationType" "public"."shipment_route_history_operationtype_enum" NOT NULL, "assignedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "completedAt" TIMESTAMP WITH TIME ZONE, "isSuccessful" boolean NOT NULL DEFAULT false, "failureReason" text, "shipmentId" uuid, "routeId" uuid, CONSTRAINT "PK_f183a5bc4f9289f015472c93809" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."route_status_enum" AS ENUM('pending', 'active', 'completed', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "route" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "totalDistance" numeric(10,2) NOT NULL, "totalFuelCost" numeric(10,2) NOT NULL, "fuelConsumption" numeric(10,2) NOT NULL, "estimatedTime" numeric(10,2) NOT NULL, "date" TIMESTAMP WITH TIME ZONE NOT NULL, "isCompleted" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "status" "public"."route_status_enum" NOT NULL DEFAULT 'pending', "lastLocationUpdate" TIMESTAMP WITH TIME ZONE, "lastLocation" geometry(Point,4326), "fullPath" geometry(LineString,4326), "startedAt" TIMESTAMP WITH TIME ZONE, "completedAt" TIMESTAMP WITH TIME ZONE, "carrierPrincipal" character varying, CONSTRAINT "PK_08affcd076e46415e5821acf52d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "carrier_configuration" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fuelEfficiency" double precision NOT NULL, "fuelCostPerLiter" double precision NOT NULL, "additionalSettings" jsonb, "carrierPrincipal" character varying, CONSTRAINT "REL_773cf43ca97d020ba5308f01b5" UNIQUE ("carrierPrincipal"), CONSTRAINT "PK_77b3a5f2ab5c32aa1e459d3f5e8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "carrier" ("principal" character varying NOT NULL, "currentLocation" geometry(Point,4326), CONSTRAINT "PK_e688c79fac486e3d73865266f97" PRIMARY KEY ("principal"))`);
        await queryRunner.query(`CREATE TABLE "address" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "street" character varying NOT NULL, "city" character varying NOT NULL, "zip" character varying NOT NULL, "country" character varying NOT NULL, "lat" double precision NOT NULL, "lng" double precision NOT NULL, CONSTRAINT "PK_d92de1f82754668b5f5f5dd4fd5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "shipper" ("principal" character varying NOT NULL, CONSTRAINT "PK_eadaa45bc8197ba9853fdd047be" PRIMARY KEY ("principal"))`);
        await queryRunner.query(`CREATE TYPE "public"."shipment_status_enum" AS ENUM('PENDING', 'BOUGHT', 'ROUTE_SET', 'PICKED_UP', 'IN_DELIVERY', 'DELIVERED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "shipment" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "canisterShipmentId" bigint NOT NULL, "status" "public"."shipment_status_enum" NOT NULL DEFAULT 'PENDING', "value" numeric(10,2) NOT NULL, "price" numeric(10,2) NOT NULL, "size" text NOT NULL, "hashedSecret" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "eta" TIMESTAMP WITH TIME ZONE, "lastRouteSegment" jsonb, "trackingToken" character varying, "pickupWindowStart" TIMESTAMP WITH TIME ZONE, "pickupWindowEnd" TIMESTAMP WITH TIME ZONE, "deliveryWindowStart" TIMESTAMP WITH TIME ZONE, "deliveryWindowEnd" TIMESTAMP WITH TIME ZONE, "shipperPrincipal" character varying NOT NULL, "carrierPrincipal" character varying, "pickupAddressId" uuid, "deliveryAddressId" uuid, CONSTRAINT "UQ_578e971708483c63fc04c325db4" UNIQUE ("canisterShipmentId"), CONSTRAINT "REL_22798fce4976de82c80bce222e" UNIQUE ("pickupAddressId"), CONSTRAINT "REL_7b9090c09dccd175e0042711b7" UNIQUE ("deliveryAddressId"), CONSTRAINT "PK_f51f635db95c534ca206bf7a0a4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "shipment_sequence" ("id" character varying NOT NULL, "lastProcessedSequence" bigint NOT NULL, "lastUpdated" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c2a7187295653d4985a99523282" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "route_delay" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "recordedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "delayMinutes" integer NOT NULL, "location" geometry(Point,4326) NOT NULL, "metadata" jsonb, "stopId" uuid, CONSTRAINT "PK_ef40853116242b75ff501ac2ca7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "route_stop" ADD CONSTRAINT "FK_30865d2b7832f4f8e6bec6e69f2" FOREIGN KEY ("routeId") REFERENCES "route"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "route_stop" ADD CONSTRAINT "FK_f45d0e032f45c4d044687a15336" FOREIGN KEY ("shipmentId") REFERENCES "shipment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "route_segment" ADD CONSTRAINT "FK_8072637511d0de13e1561469bec" FOREIGN KEY ("routeId") REFERENCES "route"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "route_segment" ADD CONSTRAINT "FK_1f893e590ac89b490b3ac56a6a5" FOREIGN KEY ("fromStopId") REFERENCES "route_stop"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "route_segment" ADD CONSTRAINT "FK_d3509e93e8bc7348d851c1fa3fe" FOREIGN KEY ("toStopId") REFERENCES "route_stop"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "route_metrics" ADD CONSTRAINT "FK_62202da731e99f7a24fea865bd0" FOREIGN KEY ("routeId") REFERENCES "route"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "route_distance_matrix" ADD CONSTRAINT "FK_bfeb7efb9b9dc48027555d4f5cc" FOREIGN KEY ("routeId") REFERENCES "route"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "shipment_route_history" ADD CONSTRAINT "FK_64e9f9cf7a75583a9f428bd640d" FOREIGN KEY ("shipmentId") REFERENCES "shipment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "shipment_route_history" ADD CONSTRAINT "FK_da6d3022db19efdd236c9d9d964" FOREIGN KEY ("routeId") REFERENCES "route"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "route" ADD CONSTRAINT "FK_6a5e647ae04cd290e87603e3edf" FOREIGN KEY ("carrierPrincipal") REFERENCES "carrier"("principal") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "carrier_configuration" ADD CONSTRAINT "FK_773cf43ca97d020ba5308f01b51" FOREIGN KEY ("carrierPrincipal") REFERENCES "carrier"("principal") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "carrier" ADD CONSTRAINT "FK_e688c79fac486e3d73865266f97" FOREIGN KEY ("principal") REFERENCES "icp_user"("principal") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "shipper" ADD CONSTRAINT "FK_eadaa45bc8197ba9853fdd047be" FOREIGN KEY ("principal") REFERENCES "icp_user"("principal") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "shipment" ADD CONSTRAINT "FK_e9c42b40dbe605f21c189851d28" FOREIGN KEY ("shipperPrincipal") REFERENCES "shipper"("principal") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "shipment" ADD CONSTRAINT "FK_a6463c8a8cd67010e3275a7278c" FOREIGN KEY ("carrierPrincipal") REFERENCES "carrier"("principal") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "shipment" ADD CONSTRAINT "FK_22798fce4976de82c80bce222e7" FOREIGN KEY ("pickupAddressId") REFERENCES "address"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "shipment" ADD CONSTRAINT "FK_7b9090c09dccd175e0042711b7f" FOREIGN KEY ("deliveryAddressId") REFERENCES "address"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "route_delay" ADD CONSTRAINT "FK_506531caa74d474ed486a551c3e" FOREIGN KEY ("stopId") REFERENCES "route_stop"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "route_delay" DROP CONSTRAINT "FK_506531caa74d474ed486a551c3e"`);
        await queryRunner.query(`ALTER TABLE "shipment" DROP CONSTRAINT "FK_7b9090c09dccd175e0042711b7f"`);
        await queryRunner.query(`ALTER TABLE "shipment" DROP CONSTRAINT "FK_22798fce4976de82c80bce222e7"`);
        await queryRunner.query(`ALTER TABLE "shipment" DROP CONSTRAINT "FK_a6463c8a8cd67010e3275a7278c"`);
        await queryRunner.query(`ALTER TABLE "shipment" DROP CONSTRAINT "FK_e9c42b40dbe605f21c189851d28"`);
        await queryRunner.query(`ALTER TABLE "shipper" DROP CONSTRAINT "FK_eadaa45bc8197ba9853fdd047be"`);
        await queryRunner.query(`ALTER TABLE "carrier" DROP CONSTRAINT "FK_e688c79fac486e3d73865266f97"`);
        await queryRunner.query(`ALTER TABLE "carrier_configuration" DROP CONSTRAINT "FK_773cf43ca97d020ba5308f01b51"`);
        await queryRunner.query(`ALTER TABLE "route" DROP CONSTRAINT "FK_6a5e647ae04cd290e87603e3edf"`);
        await queryRunner.query(`ALTER TABLE "shipment_route_history" DROP CONSTRAINT "FK_da6d3022db19efdd236c9d9d964"`);
        await queryRunner.query(`ALTER TABLE "shipment_route_history" DROP CONSTRAINT "FK_64e9f9cf7a75583a9f428bd640d"`);
        await queryRunner.query(`ALTER TABLE "route_distance_matrix" DROP CONSTRAINT "FK_bfeb7efb9b9dc48027555d4f5cc"`);
        await queryRunner.query(`ALTER TABLE "route_metrics" DROP CONSTRAINT "FK_62202da731e99f7a24fea865bd0"`);
        await queryRunner.query(`ALTER TABLE "route_segment" DROP CONSTRAINT "FK_d3509e93e8bc7348d851c1fa3fe"`);
        await queryRunner.query(`ALTER TABLE "route_segment" DROP CONSTRAINT "FK_1f893e590ac89b490b3ac56a6a5"`);
        await queryRunner.query(`ALTER TABLE "route_segment" DROP CONSTRAINT "FK_8072637511d0de13e1561469bec"`);
        await queryRunner.query(`ALTER TABLE "route_stop" DROP CONSTRAINT "FK_f45d0e032f45c4d044687a15336"`);
        await queryRunner.query(`ALTER TABLE "route_stop" DROP CONSTRAINT "FK_30865d2b7832f4f8e6bec6e69f2"`);
        await queryRunner.query(`DROP TABLE "route_delay"`);
        await queryRunner.query(`DROP TABLE "shipment_sequence"`);
        await queryRunner.query(`DROP TABLE "shipment"`);
        await queryRunner.query(`DROP TYPE "public"."shipment_status_enum"`);
        await queryRunner.query(`DROP TABLE "shipper"`);
        await queryRunner.query(`DROP TABLE "address"`);
        await queryRunner.query(`DROP TABLE "carrier"`);
        await queryRunner.query(`DROP TABLE "carrier_configuration"`);
        await queryRunner.query(`DROP TABLE "route"`);
        await queryRunner.query(`DROP TYPE "public"."route_status_enum"`);
        await queryRunner.query(`DROP TABLE "shipment_route_history"`);
        await queryRunner.query(`DROP TYPE "public"."shipment_route_history_operationtype_enum"`);
        await queryRunner.query(`DROP TABLE "route_distance_matrix"`);
        await queryRunner.query(`DROP TABLE "route_metrics"`);
        await queryRunner.query(`DROP TABLE "route_segment"`);
        await queryRunner.query(`DROP TABLE "route_stop"`);
        await queryRunner.query(`DROP TYPE "public"."route_stop_stoptype_enum"`);
        await queryRunner.query(`DROP TABLE "icp_user"`);
    }

}

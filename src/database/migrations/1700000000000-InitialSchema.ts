import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create accounts table
    await queryRunner.query(`
      CREATE TABLE "accounts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "handle" varchar(255) UNIQUE NOT NULL,
        "displayName" varchar(255),
        "status" varchar(20) NOT NULL DEFAULT 'active' CHECK ("status" IN ('active', 'expired', 'suspended')),
        "sessionId" uuid,
        "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create sessions table
    await queryRunner.query(`
      CREATE TABLE "sessions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "accountId" uuid NOT NULL,
        "encryptedCookies" text NOT NULL,
        "encryptionKeyId" varchar(255) NOT NULL,
        "userAgent" text NOT NULL,
        "viewport" jsonb NOT NULL,
        "healthScore" decimal(3,2) DEFAULT 1.0,
        "failureCount" integer DEFAULT 0,
        "lastActivityAt" timestamp with time zone,
        "expiresAt" timestamp with time zone NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'active' CHECK ("status" IN ('active', 'expired', 'refreshing', 'failed')),
        "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FK_sessions_account" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE
      )
    `);
    
    // Create agents table
    await queryRunner.query(`
      CREATE TABLE "agents" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "accountId" uuid NOT NULL,
        "name" varchar(255) NOT NULL,
        "keywords" text[] NOT NULL,
        "advancedRules" jsonb,
        "schedule" varchar(100),
        "dailyCap" integer DEFAULT 30,
        "concurrency" jsonb NOT NULL,
        "isActive" boolean DEFAULT true,
        "lastRunAt" timestamp with time zone,
        "nextRunAt" timestamp with time zone,
        "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FK_agents_account" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE
      )
    `);
    
    // Create leads table
    await queryRunner.query(`
      CREATE TABLE "leads" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "agentId" uuid NOT NULL,
        "postUrl" text UNIQUE NOT NULL,
        "postId" varchar(255) NOT NULL,
        "authorHandle" varchar(255) NOT NULL,
        "authorFollowers" integer,
        "content" jsonb NOT NULL,
        "metrics" jsonb NOT NULL,
        "score" decimal(3,2) NOT NULL,
        "category" varchar(10) NOT NULL CHECK ("category" IN ('hot', 'medium', 'cold')),
        "reasons" text[] NOT NULL,
        "screenshots" jsonb,
        "capturedAt" timestamp with time zone NOT NULL,
        "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FK_leads_agent" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE
      )
    `);
    
    // Create tasks table
    await queryRunner.query(`
      CREATE TABLE "tasks" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "leadId" uuid NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending', 'approved', 'snoozed', 'skipped', 'done')),
        "assigneeId" uuid,
        "snoozedUntil" timestamp with time zone,
        "approvedAt" timestamp with time zone,
        "completedAt" timestamp with time zone,
        "notes" text,
        "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FK_tasks_lead" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE
      )
    `);
    
    // Create indexes
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_accounts_handle" ON "accounts" ("handle")`);
    await queryRunner.query(`CREATE INDEX "IDX_sessions_account_health" ON "sessions" ("accountId", "healthScore")`);
    await queryRunner.query(`CREATE INDEX "IDX_sessions_expires" ON "sessions" ("expiresAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_agents_active_schedule" ON "agents" ("isActive", "nextRunAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_agents_account" ON "agents" ("accountId")`);
    await queryRunner.query(`CREATE INDEX "IDX_leads_agent_score" ON "leads" ("agentId", "category", "score" DESC)`);
    await queryRunner.query(`CREATE INDEX "IDX_leads_captured" ON "leads" ("capturedAt" DESC)`);
    await queryRunner.query(`CREATE INDEX "IDX_tasks_status" ON "tasks" ("status", "snoozedUntil")`);
    await queryRunner.query(`CREATE INDEX "IDX_tasks_lead" ON "tasks" ("leadId")`);
    
    // Add foreign key for accounts.sessionId
    await queryRunner.query(`
      ALTER TABLE "accounts" 
      ADD CONSTRAINT "FK_accounts_session" 
      FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.query(`ALTER TABLE "accounts" DROP CONSTRAINT "FK_accounts_session"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_tasks_lead"`);
    await queryRunner.query(`ALTER TABLE "leads" DROP CONSTRAINT "FK_leads_agent"`);
    await queryRunner.query(`ALTER TABLE "agents" DROP CONSTRAINT "FK_agents_account"`);
    await queryRunner.query(`ALTER TABLE "sessions" DROP CONSTRAINT "FK_sessions_account"`);
    
    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_tasks_lead"`);
    await queryRunner.query(`DROP INDEX "IDX_tasks_status"`);
    await queryRunner.query(`DROP INDEX "IDX_leads_captured"`);
    await queryRunner.query(`DROP INDEX "IDX_leads_agent_score"`);
    await queryRunner.query(`DROP INDEX "IDX_agents_account"`);
    await queryRunner.query(`DROP INDEX "IDX_agents_active_schedule"`);
    await queryRunner.query(`DROP INDEX "IDX_sessions_expires"`);
    await queryRunner.query(`DROP INDEX "IDX_sessions_account_health"`);
    await queryRunner.query(`DROP INDEX "IDX_accounts_handle"`);
    
    // Drop tables
    await queryRunner.query(`DROP TABLE "tasks"`);
    await queryRunner.query(`DROP TABLE "leads"`);
    await queryRunner.query(`DROP TABLE "agents"`);
    await queryRunner.query(`DROP TABLE "sessions"`);
    await queryRunner.query(`DROP TABLE "accounts"`);
  }
}
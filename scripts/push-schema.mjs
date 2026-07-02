#!/usr/bin/env node
/**
 * Push Drizzle schema to Neon Postgres via HTTP (no WebSocket / ws needed).
 * Usage: NODE_TLS_REJECT_UNAUTHORIZED=0 node scripts/push-schema.mjs
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error("DATABASE_URL env var is required");
    process.exit(1);
}

const sql = neon(DATABASE_URL);

const statements = [
    // 1. users
    `CREATE TABLE IF NOT EXISTS "users" (
        "id" text PRIMARY KEY,
        "name" text NOT NULL,
        "email" text NOT NULL UNIQUE,
        "email_verified" timestamp,
        "password_hash" text,
        "image" text,
        "default_monthly_income" double precision,
        "preferred_currency" text DEFAULT 'INR',
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
    )`,

    // 2. accounts
    `CREATE TABLE IF NOT EXISTS "accounts" (
        "id" text PRIMARY KEY,
        "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "type" text NOT NULL,
        "provider" text NOT NULL,
        "provider_account_id" text NOT NULL,
        "refresh_token" text,
        "access_token" text,
        "expires_at" integer,
        "token_type" text,
        "scope" text,
        "id_token" text,
        "session_state" text
    )`,

    // 3. sessions
    `CREATE TABLE IF NOT EXISTS "sessions" (
        "id" text PRIMARY KEY,
        "session_token" text NOT NULL UNIQUE,
        "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "expires" timestamp NOT NULL
    )`,

    // 4. verification_tokens
    `CREATE TABLE IF NOT EXISTS "verification_tokens" (
        "identifier" text NOT NULL,
        "token" text NOT NULL,
        "expires" timestamp NOT NULL
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_identifier_token_idx" ON "verification_tokens" ("identifier", "token")`,

    // 5. categories
    `CREATE TABLE IF NOT EXISTS "categories" (
        "id" text PRIMARY KEY,
        "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "name" text NOT NULL,
        "icon" text,
        "color" text,
        "type" text NOT NULL DEFAULT 'expense',
        "parent_id" text REFERENCES "categories"("id"),
        "sort_order" integer DEFAULT 0,
        "created_at" timestamp NOT NULL DEFAULT now()
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "categories_user_name_idx" ON "categories" ("user_id", "name")`,

    // 6. category_aliases
    `CREATE TABLE IF NOT EXISTS "category_aliases" (
        "id" text PRIMARY KEY,
        "category_id" text NOT NULL REFERENCES "categories"("id") ON DELETE CASCADE,
        "alias" text NOT NULL UNIQUE
    )`,

    // 7. expenses
    `CREATE TABLE IF NOT EXISTS "expenses" (
        "id" text PRIMARY KEY,
        "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "category_id" text NOT NULL REFERENCES "categories"("id") ON DELETE CASCADE,
        "year" integer NOT NULL,
        "month" integer NOT NULL,
        "amount" double precision NOT NULL,
        "source" text NOT NULL DEFAULT 'manual',
        "confidence" double precision,
        "notes" text,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
    )`,

    // 8. monthly_income
    `CREATE TABLE IF NOT EXISTS "monthly_income" (
        "id" text PRIMARY KEY,
        "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "year" integer NOT NULL,
        "month" integer NOT NULL,
        "amount" double precision NOT NULL,
        "source" text,
        "created_at" timestamp NOT NULL DEFAULT now()
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "monthly_income_user_year_month_source_idx" ON "monthly_income" ("user_id", "year", "month", "source")`,

    // 9. budgets
    `CREATE TABLE IF NOT EXISTS "budgets" (
        "id" text PRIMARY KEY,
        "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "category_id" text NOT NULL REFERENCES "categories"("id") ON DELETE CASCADE,
        "monthly_limit" double precision NOT NULL,
        "effective_from" text NOT NULL,
        "effective_until" text,
        "created_at" timestamp NOT NULL DEFAULT now()
    )`,

    // 10. uploads
    `CREATE TABLE IF NOT EXISTS "uploads" (
        "id" text PRIMARY KEY,
        "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "year" integer NOT NULL,
        "month" integer NOT NULL,
        "filename" text NOT NULL,
        "file_path" text NOT NULL,
        "status" text NOT NULL DEFAULT 'pending',
        "raw_ocr_text" text,
        "extracted_data" text,
        "processed_at" timestamp,
        "committed_at" timestamp,
        "created_at" timestamp NOT NULL DEFAULT now()
    )`,

    // 11. personas
    `CREATE TABLE IF NOT EXISTS "personas" (
        "id" text PRIMARY KEY,
        "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "year" integer NOT NULL,
        "month" integer NOT NULL,
        "persona_name" text NOT NULL,
        "persona_emoji" text,
        "total_spend" double precision,
        "total_income" double precision,
        "savings_rate" double precision,
        "mom_change_pct" double precision,
        "over_budget_count" integer,
        "under_budget_count" integer,
        "insights" text,
        "recommendations" text,
        "created_at" timestamp NOT NULL DEFAULT now()
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "personas_user_year_month_idx" ON "personas" ("user_id", "year", "month")`,

    // 12. forex_rates
    `CREATE TABLE IF NOT EXISTS "forex_rates" (
        "id" text PRIMARY KEY,
        "base" text NOT NULL DEFAULT 'INR',
        "target" text NOT NULL,
        "rate" double precision NOT NULL,
        "fetched_at" timestamp NOT NULL
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "forex_rates_base_target_idx" ON "forex_rates" ("base", "target")`,

    // 13. email_log
    `CREATE TABLE IF NOT EXISTS "email_log" (
        "id" text PRIMARY KEY,
        "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "type" text NOT NULL,
        "subject" text,
        "sent_at" timestamp,
        "status" text NOT NULL DEFAULT 'sent'
    )`,

    // 14. ocr_corrections
    `CREATE TABLE IF NOT EXISTS "ocr_corrections" (
        "id" text PRIMARY KEY,
        "upload_id" text NOT NULL REFERENCES "uploads"("id") ON DELETE CASCADE,
        "original_category" text,
        "corrected_category" text NOT NULL,
        "original_amount" double precision,
        "corrected_amount" double precision NOT NULL,
        "raw_ocr_line" text,
        "created_at" timestamp NOT NULL DEFAULT now()
    )`,

    // 15. audit_log
    `CREATE TABLE IF NOT EXISTS "audit_log" (
        "id" text PRIMARY KEY,
        "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "action" text NOT NULL,
        "details" text,
        "ip_address" text,
        "created_at" timestamp NOT NULL DEFAULT now()
    )`,

    // 16. password_reset_tokens
    `CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
        "id" text PRIMARY KEY,
        "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token_hash" text NOT NULL,
        "expires_at" timestamp NOT NULL,
        "used_at" timestamp,
        "created_at" timestamp NOT NULL DEFAULT now()
    )`,

    // Add missing columns (safe — ALTER IF NOT EXISTS via DO blocks)
    `DO $$ BEGIN
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "data_version" integer DEFAULT 1;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$`,

    `DO $$ BEGIN
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_changed_at" timestamp;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$`,
];

console.log(`Pushing ${statements.length} statements to Neon...`);

for (const stmt of statements) {
    const tableName = stmt.match(/"(\w+)"/)?.[1] || "index";
    try {
        await sql.query(stmt);
        console.log(`  ✓ ${tableName}`);
    } catch (err) {
        console.error(`  ✗ ${tableName}: ${err.message}`);
        process.exit(1);
    }
}

console.log("\n✅ All tables created successfully!");

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "./schema";
import { v4 as uuid } from "uuid";
import { hash } from "bcryptjs";

/**
 * Create an in-memory PGlite database for testing.
 * Returns the drizzle instance and a cleanup function.
 */
export async function createTestDb() {
    const client = new PGlite();

    const db = drizzle(client, { schema });

    // Create all tables from schema (Postgres DDL)
    await client.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      email_verified TIMESTAMP,
      password_hash TEXT,
      image TEXT,
      default_monthly_income DOUBLE PRECISION,
      preferred_currency TEXT DEFAULT 'INR',
      password_changed_at TIMESTAMP,
      data_version INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_account_id TEXT NOT NULL,
      refresh_token TEXT,
      access_token TEXT,
      expires_at INTEGER,
      token_type TEXT,
      scope TEXT,
      id_token TEXT,
      session_state TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      session_token TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS verification_tokens (
      identifier TEXT NOT NULL,
      token TEXT NOT NULL,
      expires TIMESTAMP NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS verification_tokens_identifier_token_idx
      ON verification_tokens(identifier, token);

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      icon TEXT,
      color TEXT,
      type TEXT NOT NULL DEFAULT 'expense',
      parent_id TEXT REFERENCES categories(id),
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS categories_user_name_idx
      ON categories(user_id, name);

    CREATE TABLE IF NOT EXISTS category_aliases (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      alias TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      amount DOUBLE PRECISION NOT NULL,
      source TEXT NOT NULL DEFAULT 'manual',
      confidence DOUBLE PRECISION,
      notes TEXT,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS monthly_income (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      amount DOUBLE PRECISION NOT NULL,
      source TEXT,
      created_at TIMESTAMP NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS monthly_income_user_year_month_source_idx
      ON monthly_income(user_id, year, month, source);

    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      monthly_limit DOUBLE PRECISION NOT NULL,
      effective_from TEXT NOT NULL,
      effective_until TEXT,
      created_at TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS uploads (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      raw_ocr_text TEXT,
      extracted_data TEXT,
      processed_at TIMESTAMP,
      committed_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS personas (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      persona_name TEXT NOT NULL,
      persona_emoji TEXT,
      total_spend DOUBLE PRECISION,
      total_income DOUBLE PRECISION,
      savings_rate DOUBLE PRECISION,
      mom_change_pct DOUBLE PRECISION,
      over_budget_count INTEGER,
      under_budget_count INTEGER,
      insights TEXT,
      recommendations TEXT,
      created_at TIMESTAMP NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS personas_user_year_month_idx
      ON personas(user_id, year, month);

    CREATE TABLE IF NOT EXISTS forex_rates (
      id TEXT PRIMARY KEY,
      base TEXT NOT NULL DEFAULT 'INR',
      target TEXT NOT NULL,
      rate DOUBLE PRECISION NOT NULL,
      fetched_at TIMESTAMP NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS forex_rates_base_target_idx
      ON forex_rates(base, target);

    CREATE TABLE IF NOT EXISTS email_log (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      subject TEXT,
      sent_at TIMESTAMP,
      status TEXT NOT NULL DEFAULT 'sent'
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      created_at TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ocr_corrections (
      id TEXT PRIMARY KEY,
      upload_id TEXT NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
      original_category TEXT,
      corrected_category TEXT NOT NULL,
      original_amount DOUBLE PRECISION,
      corrected_amount DOUBLE PRECISION NOT NULL,
      raw_ocr_line TEXT,
      created_at TIMESTAMP NOT NULL
    );
  `);

    return {
        db,
        client,
        cleanup: async () => await client.close(),
    };
}

/**
 * Seed a test user and return their ID.
 */
export async function seedTestUser(
    db: Awaited<ReturnType<typeof createTestDb>>["db"],
    overrides: Partial<{ name: string; email: string; password: string }> = {}
) {
    const id = uuid();
    const passwordHash = await hash(overrides.password || "testpassword123", 10);

    await db.insert(schema.users).values({
        id,
        name: overrides.name || "Test User",
        email: overrides.email || "test@kharcha.app",
        passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    return id;
}

/**
 * Seed a test category and return its ID.
 */
export async function seedTestCategory(
    db: Awaited<ReturnType<typeof createTestDb>>["db"],
    userId: string,
    overrides: Partial<{ name: string; type: "expense" | "investment" }> = {}
) {
    const id = uuid();

    await db.insert(schema.categories).values({
        id,
        userId,
        name: overrides.name || "Food",
        type: overrides.type || "expense",
        createdAt: new Date(),
    });

    return id;
}

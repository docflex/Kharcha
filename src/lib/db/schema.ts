import {
    pgTable,
    text,
    integer,
    doublePrecision,
    timestamp,
    uniqueIndex,
} from "drizzle-orm/pg-core";

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: timestamp("email_verified"),
    passwordHash: text("password_hash"),
    image: text("image"),
    defaultMonthlyIncome: doublePrecision("default_monthly_income"),
    preferredCurrency: text("preferred_currency").default("INR"),
    passwordChangedAt: timestamp("password_changed_at"),
    dataVersion: integer("data_version").notNull().default(0),
    createdAt: timestamp("created_at")
        .notNull()
        .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
        .notNull()
        .$defaultFn(() => new Date()),
});

// ─── NextAuth Accounts (OAuth) ───────────────────────────────────────────────

export const accounts = pgTable("accounts", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refreshToken: text("refresh_token"),
    accessToken: text("access_token"),
    expiresAt: integer("expires_at"),
    tokenType: text("token_type"),
    scope: text("scope"),
    idToken: text("id_token"),
    sessionState: text("session_state"),
});

// ─── NextAuth Sessions ───────────────────────────────────────────────────────

export const sessions = pgTable("sessions", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    sessionToken: text("session_token").notNull().unique(),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires").notNull(),
});

// ─── NextAuth Verification Tokens ────────────────────────────────────────────

export const verificationTokens = pgTable(
    "verification_tokens",
    {
        identifier: text("identifier").notNull(),
        token: text("token").notNull(),
        expires: timestamp("expires").notNull(),
    },
    (table) => [
        uniqueIndex("verification_tokens_identifier_token_idx").on(table.identifier, table.token),
    ]
);

// ─── Categories ──────────────────────────────────────────────────────────────

export const categories = pgTable(
    "categories",
    {
        id: text("id").primaryKey(),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        icon: text("icon"), // Lucide icon name
        color: text("color"), // hex color
        type: text("type", { enum: ["expense", "investment"] })
            .notNull()
            .default("expense"),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        parentId: text("parent_id").references((): any => categories.id),
        sortOrder: integer("sort_order").default(0),
        createdAt: timestamp("created_at")
            .notNull()
            .$defaultFn(() => new Date()),
    },
    (table) => [uniqueIndex("categories_user_name_idx").on(table.userId, table.name)]
);

// ─── Category Aliases (OCR mapping) ─────────────────────────────────────────

export const categoryAliases = pgTable("category_aliases", {
    id: text("id").primaryKey(),
    categoryId: text("category_id")
        .notNull()
        .references(() => categories.id, { onDelete: "cascade" }),
    alias: text("alias").notNull().unique(),
});

// ─── Expenses ────────────────────────────────────────────────────────────────

export const expenses = pgTable("expenses", {
    id: text("id").primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
        .notNull()
        .references(() => categories.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    month: integer("month").notNull(), // 1-12
    amount: doublePrecision("amount").notNull(),
    source: text("source", { enum: ["manual", "ocr", "import"] })
        .notNull()
        .default("manual"),
    confidence: doublePrecision("confidence"), // OCR confidence 0.0-1.0
    notes: text("notes"),
    createdAt: timestamp("created_at")
        .notNull()
        .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
        .notNull()
        .$defaultFn(() => new Date()),
});

// ─── Monthly Income ──────────────────────────────────────────────────────────

export const monthlyIncome = pgTable(
    "monthly_income",
    {
        id: text("id").primaryKey(),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        year: integer("year").notNull(),
        month: integer("month").notNull(),
        amount: doublePrecision("amount").notNull(),
        source: text("source"), // e.g., "salary", "freelance", "bonus"
        createdAt: timestamp("created_at")
            .notNull()
            .$defaultFn(() => new Date()),
    },
    (table) => [
        uniqueIndex("monthly_income_user_year_month_source_idx").on(
            table.userId,
            table.year,
            table.month,
            table.source
        ),
    ]
);

// ─── Budget Targets ──────────────────────────────────────────────────────────

export const budgets = pgTable("budgets", {
    id: text("id").primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
        .notNull()
        .references(() => categories.id, { onDelete: "cascade" }),
    monthlyLimit: doublePrecision("monthly_limit").notNull(),
    effectiveFrom: text("effective_from").notNull(), // 'YYYY-MM'
    effectiveUntil: text("effective_until"), // null = still active
    createdAt: timestamp("created_at")
        .notNull()
        .$defaultFn(() => new Date()),
});

// ─── Screenshot Uploads ──────────────────────────────────────────────────────

export const uploads = pgTable("uploads", {
    id: text("id").primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    month: integer("month").notNull(),
    filename: text("filename").notNull(),
    filePath: text("file_path").notNull(),
    status: text("status", {
        enum: ["pending", "processing", "review", "committed", "failed"],
    })
        .notNull()
        .default("pending"),
    rawOcrText: text("raw_ocr_text"),
    extractedData: text("extracted_data"), // JSON string
    processedAt: timestamp("processed_at"),
    committedAt: timestamp("committed_at"),
    createdAt: timestamp("created_at")
        .notNull()
        .$defaultFn(() => new Date()),
});

// ─── Monthly Personas ────────────────────────────────────────────────────────

export const personas = pgTable(
    "personas",
    {
        id: text("id").primaryKey(),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        year: integer("year").notNull(),
        month: integer("month").notNull(),
        personaName: text("persona_name").notNull(),
        personaEmoji: text("persona_emoji"),
        totalSpend: doublePrecision("total_spend"),
        totalIncome: doublePrecision("total_income"),
        savingsRate: doublePrecision("savings_rate"),
        momChangePct: doublePrecision("mom_change_pct"),
        overBudgetCount: integer("over_budget_count"),
        underBudgetCount: integer("under_budget_count"),
        insights: text("insights"), // JSON string
        recommendations: text("recommendations"), // JSON string
        createdAt: timestamp("created_at")
            .notNull()
            .$defaultFn(() => new Date()),
    },
    (table) => [
        uniqueIndex("personas_user_year_month_idx").on(table.userId, table.year, table.month),
    ]
);

// ─── Forex Rate Cache ────────────────────────────────────────────────────────

export const forexRates = pgTable(
    "forex_rates",
    {
        id: text("id").primaryKey(),
        base: text("base").notNull().default("INR"),
        target: text("target").notNull(),
        rate: doublePrecision("rate").notNull(),
        fetchedAt: timestamp("fetched_at").notNull(),
    },
    (table) => [uniqueIndex("forex_rates_base_target_idx").on(table.base, table.target)]
);

// ─── Email Log ───────────────────────────────────────────────────────────────

export const emailLog = pgTable("email_log", {
    id: text("id").primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    type: text("type", {
        enum: ["upload_reminder", "dashboard_ready", "password_reset"],
    }).notNull(),
    subject: text("subject"),
    sentAt: timestamp("sent_at"),
    status: text("status", { enum: ["sent", "failed"] })
        .notNull()
        .default("sent"),
});

// ─── Audit Log ──────────────────────────────────────────────────────────────

export const auditLog = pgTable("audit_log", {
    id: text("id").primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    details: text("details"), // JSON string
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at")
        .notNull()
        .$defaultFn(() => new Date()),
});

// ─── Password Reset Tokens ──────────────────────────────────────────────────

export const passwordResetTokens = pgTable("password_reset_tokens", {
    id: text("id").primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at")
        .notNull()
        .$defaultFn(() => new Date()),
});

// ─── OCR Corrections (for adaptive learning) ────────────────────────────────

export const ocrCorrections = pgTable("ocr_corrections", {
    id: text("id").primaryKey(),
    uploadId: text("upload_id")
        .notNull()
        .references(() => uploads.id, { onDelete: "cascade" }),
    originalCategory: text("original_category"),
    correctedCategory: text("corrected_category").notNull(),
    originalAmount: doublePrecision("original_amount"),
    correctedAmount: doublePrecision("corrected_amount").notNull(),
    rawOcrLine: text("raw_ocr_line"),
    createdAt: timestamp("created_at")
        .notNull()
        .$defaultFn(() => new Date()),
});

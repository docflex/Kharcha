import type { PgDatabase } from "drizzle-orm/pg-core";
import { eq, and } from "drizzle-orm";
import * as schema from "../db/schema";
import { FOREX_CACHE_TTL_MS } from "../constants";

// Allow self-signed certs in dev (proxy/VPN environments)
if (process.env.NODE_ENV === "development") {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = PgDatabase<any, typeof schema>;

const FRANKFURTER_BASE = "https://api.frankfurter.app";
const FAWAZ_BASE = "https://latest.currency-api.pages.dev/v1/currencies";

export interface ForexRate {
    base: string;
    target: string;
    rate: number;
    fetchedAt: Date;
    cached: boolean;
}

/**
 * Get the exchange rate from `base` to `target`.
 * Checks SQLite cache first (24h TTL), then fetches from Frankfurter API.
 * Cache failures are non-fatal — API calls always work.
 */
export async function getRate(db: DB, base: string, target: string): Promise<ForexRate> {
    if (base === target) {
        return { base, target, rate: 1, fetchedAt: new Date(), cached: true };
    }

    // Check cache (non-fatal if table missing)
    try {
        const [cached] = await db
            .select()
            .from(schema.forexRates)
            .where(and(eq(schema.forexRates.base, base), eq(schema.forexRates.target, target)));

        if (cached) {
            const age = Date.now() - cached.fetchedAt.getTime();
            if (age < FOREX_CACHE_TTL_MS) {
                return {
                    base: cached.base,
                    target: cached.target,
                    rate: cached.rate,
                    fetchedAt: cached.fetchedAt,
                    cached: true,
                };
            }
        }
    } catch (_e) {
        // Cache table may not exist — proceed to API
    }

    // Fetch fresh rate from API
    const rate = await fetchRate(base, target);
    const now = new Date();

    // Try to cache (non-fatal)
    try {
        const id = `${base}-${target}`;
        await db
            .insert(schema.forexRates)
            .values({ id, base, target, rate, fetchedAt: now })
            .onConflictDoUpdate({
                target: schema.forexRates.id,
                set: { rate, fetchedAt: now },
            });
    } catch (_e) {
        // Cache write failed — not critical
    }

    return { base, target, rate, fetchedAt: now, cached: false };
}

/**
 * Get all rates from INR to all supported currencies at once.
 * Uses Frankfurter's multi-target endpoint for efficiency.
 * Cache failures are non-fatal — API calls always work.
 */
export async function getAllRates(
    db: DB,
    base: string,
    targets: string[]
): Promise<Record<string, number>> {
    const rates: Record<string, number> = {};
    const stale: string[] = [];

    // Single batch query for all cached rates (was N queries)
    try {
        const cachedRows = await db
            .select()
            .from(schema.forexRates)
            .where(eq(schema.forexRates.base, base));

        const cachedMap = new Map(cachedRows.map((r) => [r.target, r]));

        for (const target of targets) {
            if (target === base) {
                rates[target] = 1;
                continue;
            }
            const cached = cachedMap.get(target);
            if (cached && Date.now() - cached.fetchedAt.getTime() < FOREX_CACHE_TTL_MS) {
                rates[target] = cached.rate;
            } else {
                stale.push(target);
            }
        }
    } catch (_e) {
        // Cache read failed — fetch all from API
        for (const target of targets) {
            if (target !== base) stale.push(target);
            else rates[target] = 1;
        }
    }

    // Batch fetch any stale/missing rates from API
    if (stale.length > 0) {
        const freshRates = await fetchRates(base, stale);
        const now = new Date();

        for (const target of stale) {
            const rate = freshRates[target];
            if (rate != null) {
                rates[target] = rate;

                // Try to cache (non-fatal)
                try {
                    const id = `${base}-${target}`;
                    await db
                        .insert(schema.forexRates)
                        .values({ id, base, target, rate, fetchedAt: now })
                        .onConflictDoUpdate({
                            target: schema.forexRates.id,
                            set: { rate, fetchedAt: now },
                        });
                } catch (_e) {
                    // Cache write failed — not critical
                }
            }
        }
    }

    return rates;
}

/**
 * Fetch a single rate — tries Frankfurter, then fawazahmed0.
 * Throws if all sources fail.
 */
async function fetchRate(base: string, target: string): Promise<number> {
    // Try Frankfurter
    try {
        const res = await fetch(`${FRANKFURTER_BASE}/latest?from=${base}&to=${target}`);
        if (res.ok) {
            const data = await res.json();
            if (data.rates?.[target] != null) return data.rates[target];
        }
    } catch (_e) {
        // Network/TLS error — try next source
    }

    // Try fawazahmed0
    try {
        const code = base.toLowerCase();
        const res = await fetch(`${FAWAZ_BASE}/${code}.json`);
        if (res.ok) {
            const data = await res.json();
            const rate = data[code]?.[target.toLowerCase()];
            if (rate != null) return rate;
        }
    } catch (_e) {
        // Network/TLS error
    }

    throw new Error(`Failed to fetch rate for ${base} → ${target}`);
}

/**
 * Fetch multiple rates — tries Frankfurter, then fawazahmed0.
 * Throws if all sources fail.
 */
async function fetchRates(base: string, targets: string[]): Promise<Record<string, number>> {
    // Try Frankfurter (batch)
    try {
        const res = await fetch(`${FRANKFURTER_BASE}/latest?from=${base}&to=${targets.join(",")}`);
        if (res.ok) {
            const data = await res.json();
            if (data.rates && Object.keys(data.rates).length > 0) return data.rates;
        }
    } catch (_e) {
        // Network/TLS error — try next source
    }

    // Try fawazahmed0
    try {
        const code = base.toLowerCase();
        const res = await fetch(`${FAWAZ_BASE}/${code}.json`);
        if (res.ok) {
            const data = await res.json();
            const allRates = data[code] || {};
            const result: Record<string, number> = {};
            for (const t of targets) {
                const rate = allRates[t.toLowerCase()];
                if (rate != null) result[t] = rate;
            }
            if (Object.keys(result).length > 0) return result;
        }
    } catch (_e) {
        // Network/TLS error
    }

    throw new Error(`Failed to fetch exchange rates from all sources`);
}

import type { PersonaArchetype, PersonaSignals } from "./types";

/**
 * 9 persona archetypes, ordered by priority (highest first).
 * The engine checks each archetype in priority order and picks the first match.
 *
 * Priority logic:
 * - Red Flagger (100): critical — spending > income is always flagged first
 * - Overachiever (90): exceptional — hard to achieve, should be recognized
 * - Saver (80): strong savings rate
 * - Optimizer (70): good savings + improving trend
 * - Generous (60): specific category pattern (Gift/Entertainment heavy)
 * - Explorer (50): new categories appeared
 * - Steady (40): low variance — the "default good" state
 * - Stretcher (30): spending rising, some budget overruns
 * - Splurger (20): low savings, many overruns — least specific negative
 */
export const PERSONA_ARCHETYPES: PersonaArchetype[] = [
    {
        name: "The Red Flagger",
        emoji: "🚩",
        description: "Spending exceeds income — time to pump the brakes and reassess priorities.",
        priority: 100,
        matches: (s: PersonaSignals) => s.savingsRate < 0,
    },
    {
        name: "The Overachiever",
        emoji: "🔥",
        description:
            "Spending less than half your income with every budget met — financial discipline at its finest.",
        priority: 90,
        matches: (s: PersonaSignals) =>
            s.totalIncome > 0 &&
            s.totalSpend / s.totalIncome < 0.5 &&
            s.overBudgetCount === 0 &&
            s.totalBudgetedCategories > 0,
    },
    {
        name: "The Saver",
        emoji: "🏦",
        description:
            "Saving over 40% of income with most categories under budget — your future self thanks you.",
        priority: 80,
        matches: (s: PersonaSignals) => {
            if (s.totalBudgetedCategories === 0) return s.savingsRate > 40;
            const underRatio = s.underBudgetCount / s.totalBudgetedCategories;
            return s.savingsRate > 40 && underRatio > 0.5;
        },
    },
    {
        name: "The Optimizer",
        emoji: "🧘",
        description:
            "Solid savings rate with spending trending down — you're fine-tuning your finances.",
        priority: 70,
        matches: (s: PersonaSignals) =>
            s.savingsRate >= 25 &&
            s.savingsRate <= 40 &&
            s.momChangePct !== null &&
            s.momChangePct < 0,
    },
    {
        name: "The Generous",
        emoji: "🎁",
        description:
            "Gift and entertainment spending is high, but overall spending stays moderate — enjoy responsibly!",
        priority: 60,
        matches: (s: PersonaSignals) => {
            const giftEntertainment = s.categoryMoMChanges.filter((c) =>
                ["Gift", "Entertainment", "Gifts"].includes(c.categoryName)
            );
            if (giftEntertainment.length === 0) return false;
            const giftTotal = giftEntertainment.reduce((sum, c) => sum + c.currentAmount, 0);
            // Gift+Entertainment is >15% of total spend AND overall spend is moderate
            return s.totalSpend > 0 && giftTotal / s.totalSpend > 0.15 && s.savingsRate >= 10;
        },
    },
    {
        name: "The Explorer",
        emoji: "🧭",
        description:
            "New spending categories appeared this month — branching out into new territory.",
        priority: 50,
        matches: (s: PersonaSignals) =>
            s.newCategories.length >= 2 && (s.momChangePct === null || s.momChangePct <= 25),
    },
    {
        name: "The Steady",
        emoji: "⚖️",
        description: "Spending barely changed month-over-month — consistency is a superpower.",
        priority: 40,
        matches: (s: PersonaSignals) => s.momChangePct !== null && Math.abs(s.momChangePct) < 5,
    },
    {
        name: "The Stretcher",
        emoji: "📈",
        description:
            "Spending jumped significantly with some budgets exceeded — keep an eye on the trend.",
        priority: 30,
        matches: (s: PersonaSignals) =>
            s.momChangePct !== null && s.momChangePct > 15 && s.overBudgetCount > 0,
    },
    {
        name: "The Splurger",
        emoji: "💸",
        description: "Low savings rate with multiple budgets blown — time for a spending check-in.",
        priority: 20,
        matches: (s: PersonaSignals) =>
            s.savingsRate < 10 && s.savingsRate >= 0 && s.overBudgetCount >= 2,
    },
];

/**
 * Find the matching persona for the given signals.
 * Archetypes are checked in priority order (highest first).
 * Falls back to "The Steady" if nothing else matches.
 */
export function matchPersona(signals: PersonaSignals): PersonaArchetype {
    // Sort by priority descending (should already be, but be safe)
    const sorted = [...PERSONA_ARCHETYPES].sort((a, b) => b.priority - a.priority);

    for (const archetype of sorted) {
        if (archetype.matches(signals)) {
            return archetype;
        }
    }

    // Default fallback — The Steady
    return PERSONA_ARCHETYPES.find((a) => a.name === "The Steady")!;
}

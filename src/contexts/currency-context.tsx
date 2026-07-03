"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils/currency";
import { useAppStore } from "@/stores/app-store";

type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]["code"];

interface CurrencyContextValue {
    currency: CurrencyCode;
    setCurrency: (code: CurrencyCode) => void;
    rate: number;
    loading: boolean;
    error: string | null;
    format: (amountInINR: number) => string;
    convert: (amountInINR: number) => number;
}

const CurrencyContext = createContext<CurrencyContextValue>({
    currency: "INR",
    setCurrency: () => {},
    rate: 1,
    loading: false,
    error: null,
    format: (amount) => formatCurrency(amount, "INR"),
    convert: (amount) => amount,
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
    const [currency, setCurrencyState] = useState<CurrencyCode>("INR");
    const [rates, setRates] = useState<Record<string, number>>({ INR: 1 });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Restore from localStorage
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        const saved = localStorage.getItem("kharcha-currency");
        if (saved) {
            const valid = SUPPORTED_CURRENCIES.find((c) => c.code === saved);
            if (valid) setCurrencyState(valid.code);
        }
    }, []);
    /* eslint-enable react-hooks/set-state-in-effect */

    // Fetch all rates when component mounts (one batch call)
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError(null);
        fetch("/api/forex?from=INR&all=true", { signal: controller.signal })
            .then((r) => r.json())
            .then((res) => {
                if (res.data?.rates) {
                    setRates(res.data.rates);
                    setError(null);
                } else {
                    setError("Unable to fetch exchange rates. Currency conversion unavailable.");
                }
            })
            .catch((err) => {
                if (err?.name !== "AbortError") {
                    setError("Unable to fetch exchange rates. Currency conversion unavailable.");
                }
            })
            .finally(() => setLoading(false));
        return () => controller.abort();
    }, []);
    /* eslint-enable react-hooks/set-state-in-effect */

    const hasRates = Object.keys(rates).length > 1;

    const setCurrency = useCallback(
        (code: CurrencyCode) => {
            if (code !== "INR" && !hasRates) {
                return; // Don't allow switching if rates aren't loaded
            }
            setCurrencyState(code);
            localStorage.setItem("kharcha-currency", code);
            if (code === "INR") setError(null);
        },
        [hasRates]
    );

    const rate = rates[currency] ?? 1;

    const convert = useCallback(
        (amountInINR: number) => {
            if (currency === "INR") return amountInINR;
            return amountInINR * rate;
        },
        [currency, rate]
    );

    const privacyMode = useAppStore((s) => s.privacyMode);

    const format = useCallback(
        (amountInINR: number) => {
            if (privacyMode) {
                const sym =
                    currency === "INR"
                        ? "₹"
                        : (new Intl.NumberFormat("en", {
                              style: "currency",
                              currency,
                              currencyDisplay: "narrowSymbol",
                          })
                              .formatToParts(0)
                              .find((p) => p.type === "currency")?.value ?? currency);
                return `${sym}••••••`;
            }
            const converted = convert(amountInINR);
            return formatCurrency(converted, currency);
        },
        [convert, currency, privacyMode]
    );

    return (
        <CurrencyContext.Provider
            value={{ currency, setCurrency, rate, loading, error, format, convert }}
        >
            {children}
        </CurrencyContext.Provider>
    );
}

export function useCurrency() {
    return useContext(CurrencyContext);
}

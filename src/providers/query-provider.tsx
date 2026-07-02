"use client";

import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

function createPersister() {
    if (typeof window === "undefined") return undefined;
    return createSyncStoragePersister({
        storage: window.localStorage,
        key: "kharcha:query-cache",
    });
}

function VersionGate({ children }: { children: React.ReactNode }) {
    const queryClient = useQueryClient();

    useEffect(() => {
        async function checkVersion() {
            if (window.location.pathname.startsWith("/auth")) return;
            try {
                const res = await fetch("/api/version");
                if (!res.ok) return;
                const { data } = await res.json();
                const serverVersion = data?.version ?? 0;
                const localVersion = Number(localStorage.getItem("kharcha:version") ?? "0");

                if (serverVersion > localVersion) {
                    localStorage.setItem("kharcha:version", String(serverVersion));
                    // Version mismatch — invalidate all queries so they refetch
                    queryClient.invalidateQueries();
                }
            } catch {
                // Network error — skip version check, use cached data
            }
        }
        checkVersion();
    }, [queryClient]);

    return <>{children}</>;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 5 * 60 * 1000,
                        gcTime: MAX_CACHE_AGE,
                        refetchOnWindowFocus: false,
                        retry: 1,
                    },
                    mutations: {
                        onError: (error) => {
                            const message =
                                error instanceof Error ? error.message : "Something went wrong";
                            toast.error(message);
                        },
                    },
                },
            })
    );

    const [persister] = useState(createPersister);

    if (!persister) {
        return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    return (
        <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{
                persister,
                maxAge: MAX_CACHE_AGE,
            }}
        >
            <VersionGate>{children}</VersionGate>
        </PersistQueryClientProvider>
    );
}

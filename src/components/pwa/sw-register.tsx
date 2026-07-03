"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
    useEffect(() => {
        if (
            typeof window !== "undefined" &&
            "serviceWorker" in navigator &&
            process.env.NODE_ENV === "production"
        ) {
            navigator.serviceWorker
                .register("/sw.js")
                .then((reg) => {
                    console.log("[SW] Registered, scope:", reg.scope);

                    reg.addEventListener("updatefound", () => {
                        const newWorker = reg.installing;
                        if (!newWorker) return;
                        newWorker.addEventListener("statechange", () => {
                            if (
                                newWorker.state === "activated" &&
                                navigator.serviceWorker.controller
                            ) {
                                console.log("[SW] New version available");
                            }
                        });
                    });
                })
                .catch((err) => {
                    console.error("[SW] Registration failed:", err);
                });
        }
    }, []);

    return null;
}

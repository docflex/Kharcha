"use client";

import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [show, setShow] = useState(false);

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setShow(true);
        };
        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    if (!show) return null;

    return (
        <div className="fixed bottom-20 left-4 right-4 z-50 md:bottom-4 md:left-auto md:right-4 md:w-80">
            <div className="rounded-lg border-2 border-primary bg-card p-4 shadow-[4px_4px_0px_0px] shadow-primary/30">
                <p className="font-bold text-sm">Install Kharcha</p>
                <p className="text-xs text-muted-foreground mb-3">
                    Add to your home screen for quick access
                </p>
                <div className="flex gap-2">
                    <button
                        onClick={async () => {
                            if (deferredPrompt) {
                                await deferredPrompt.prompt();
                                setShow(false);
                                setDeferredPrompt(null);
                            }
                        }}
                        className="rounded-md bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground"
                    >
                        Install
                    </button>
                    <button
                        onClick={() => setShow(false)}
                        className="rounded-md border border-border px-4 py-1.5 text-xs"
                    >
                        Not now
                    </button>
                </div>
            </div>
        </div>
    );
}

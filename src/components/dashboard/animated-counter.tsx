"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "motion/react";

interface AnimatedCounterProps {
    value: number;
    formatter: (n: number) => string;
    duration?: number;
    className?: string;
}

export function AnimatedCounter({
    value,
    formatter,
    duration = 1200,
    className = "",
}: AnimatedCounterProps) {
    const ref = useRef<HTMLSpanElement>(null);
    const inView = useInView(ref, { once: true });
    const [mounted, setMounted] = useState(false);
    const [display, setDisplay] = useState("");

    // Defer formatting to client to avoid Intl.NumberFormat SSR/client mismatch
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        setMounted(true);
    }, []);
    /* eslint-enable react-hooks/set-state-in-effect */

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!mounted) return;

        if (!inView || value === 0) {
            setDisplay(formatter(value));
            return;
        }

        const startTime = performance.now();
        let rafId: number;

        const tick = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = value * eased;
            setDisplay(formatter(current));

            if (progress < 1) {
                rafId = requestAnimationFrame(tick);
            } else {
                setDisplay(formatter(value));
            }
        };

        rafId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafId);
    }, [mounted, inView, value, formatter, duration]);
    /* eslint-enable react-hooks/set-state-in-effect */

    return (
        <span ref={ref} className={className}>
            {display}
        </span>
    );
}

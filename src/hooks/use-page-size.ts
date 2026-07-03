"use client";

import { useState, useEffect } from "react";

/**
 * Dynamically calculates how many items fit in the viewport without scrolling.
 *
 * @param itemHeight  Approximate height of one item row (px)
 * @param overhead    Fixed chrome height: header + filters + pagination footer (px)
 * @param minItems    Minimum page size floor (default 5)
 * @param maxItems    Maximum page size ceiling (default 50)
 */
export function usePageSize(
    itemHeight: number,
    overhead: number,
    minItems = 5,
    maxItems = 50,
    mobileMax = 7
): number {
    const [pageSize, setPageSize] = useState(minItems);

    useEffect(() => {
        function calculate() {
            const isMobile = window.innerWidth < 768;
            const cap = isMobile ? mobileMax : maxItems;
            const available = window.innerHeight - overhead;
            const items = Math.floor(available / itemHeight);
            setPageSize(Math.max(minItems, Math.min(cap, items)));
        }

        calculate();
        window.addEventListener("resize", calculate);
        return () => window.removeEventListener("resize", calculate);
    }, [itemHeight, overhead, minItems, maxItems, mobileMax]);

    return pageSize;
}

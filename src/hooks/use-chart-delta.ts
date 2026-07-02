"use client";

import { useState, useCallback, useRef } from "react";

export interface DeltaState {
    /** Index of the data point where drag started */
    startIdx: number | null;
    /** Index of the data point where drag currently is / ended */
    endIdx: number | null;
    /** Whether a drag is actively in progress */
    dragging: boolean;
    /** Whether a completed selection is being displayed */
    showing: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RState = Record<string, any>;

export interface ChartDeltaResult {
    delta: DeltaState;
    onMouseDown: (state: RState, event: React.MouseEvent) => void;
    onMouseMove: (state: RState) => void;
    onMouseUp: (state: RState) => void;
    onTouchStart: (state: RState) => void;
    onTouchMove: (state: RState) => void;
    onTouchEnd: () => void;
    clear: () => void;
    computeDelta: (
        data: Record<string, number | string>[],
        valueKey: string | string[]
    ) => {
        startLabel: string;
        endLabel: string;
        deltas: {
            key: string;
            startVal: number;
            endVal: number;
            diff: number;
            pct: number | null;
        }[];
    } | null;
}

const EMPTY: DeltaState = {
    startIdx: null,
    endIdx: null,
    dragging: false,
    showing: false,
};

function extractIdx(state: RState): number | null {
    const v = state?.activeTooltipIndex ?? state?.activeIndex;
    if (v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

/**
 * Interactive click-drag delta for Recharts charts.
 *
 * IMPORTANT: In Recharts v3, `onMouseDown` fires BEFORE the internal Redux
 * tooltip state updates (only `mousemove` triggers `mouseMoveAction`).
 * So `activeTooltipIndex` is stale/undefined during mousedown.
 *
 * Strategy:
 *   mousedown  → sets `mouseDownRef = true` (no idx yet)
 *   mousemove  → if mouseDown && no startIdx, capture first idx as start
 *              → otherwise update endIdx
 *   mouseup    → finalize selection
 *
 * For touch: Recharts fires onTouchStart with correct index (via touchmove
 * dispatch), so we use a long-press timer to activate drag mode.
 */
export function useChartDelta(): ChartDeltaResult {
    const [delta, setDelta] = useState<DeltaState>(EMPTY);
    const mouseDownRef = useRef(false);
    const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const touchActiveRef = useRef(false);

    const onMouseDown = useCallback((_state: RState, event: React.MouseEvent) => {
        event?.preventDefault?.();
        mouseDownRef.current = true;
        setDelta((prev) => (prev.showing ? EMPTY : prev));
    }, []);

    const onMouseMove = useCallback((state: RState) => {
        if (!mouseDownRef.current) return;
        const idx = extractIdx(state);
        if (idx == null) return;
        setDelta((prev) => {
            if (prev.startIdx == null) {
                return { startIdx: idx, endIdx: idx, dragging: true, showing: false };
            }
            return { ...prev, endIdx: idx };
        });
    }, []);

    const onMouseUp = useCallback((_state: RState) => {
        mouseDownRef.current = false;
        setDelta((prev) => {
            if (!prev.dragging) return prev;
            if (prev.startIdx == null || prev.startIdx === prev.endIdx) return EMPTY;
            return { ...prev, dragging: false, showing: true };
        });
    }, []);

    const onTouchStart = useCallback((state: RState) => {
        const idx = extractIdx(state);
        touchActiveRef.current = false;
        if (longPressRef.current) clearTimeout(longPressRef.current);
        longPressRef.current = setTimeout(() => {
            touchActiveRef.current = true;
            if (idx != null) {
                setDelta({ startIdx: idx, endIdx: idx, dragging: true, showing: false });
            }
        }, 250);
    }, []);

    const onTouchMove = useCallback((state: RState) => {
        if (!touchActiveRef.current) {
            if (longPressRef.current) {
                clearTimeout(longPressRef.current);
                longPressRef.current = null;
            }
            return;
        }
        const idx = extractIdx(state);
        setDelta((prev) => {
            if (!prev.dragging || idx == null) return prev;
            return { ...prev, endIdx: idx };
        });
    }, []);

    const onTouchEnd = useCallback(() => {
        if (longPressRef.current) {
            clearTimeout(longPressRef.current);
            longPressRef.current = null;
        }
        touchActiveRef.current = false;
        setDelta((prev) => {
            if (!prev.dragging) return prev;
            if (prev.startIdx == null || prev.startIdx === prev.endIdx) return EMPTY;
            return { ...prev, dragging: false, showing: true };
        });
    }, []);

    const clear = useCallback(() => setDelta(EMPTY), []);

    const computeDelta = useCallback(
        (data: Record<string, number | string>[], valueKey: string | string[]) => {
            if (delta.startIdx == null || delta.endIdx == null) return null;
            if (delta.startIdx === delta.endIdx) return null;
            const lo = Math.min(delta.startIdx, delta.endIdx);
            const hi = Math.max(delta.startIdx, delta.endIdx);
            if (lo < 0 || hi >= data.length) return null;

            const keys = Array.isArray(valueKey) ? valueKey : [valueKey];
            // Preserve drag direction: "from" is where drag started, "to" is current position
            const fromPoint = data[delta.startIdx];
            const toPoint = data[delta.endIdx];

            const startLabel = String(
                fromPoint.label ?? fromPoint.period ?? fromPoint.name ?? delta.startIdx
            );
            const endLabel = String(
                toPoint.label ?? toPoint.period ?? toPoint.name ?? delta.endIdx
            );

            const deltas = keys.map((key) => {
                const startVal = Number(fromPoint[key]) || 0;
                const endVal = Number(toPoint[key]) || 0;
                const diff = endVal - startVal;
                const pct = startVal !== 0 ? (diff / startVal) * 100 : null;
                return { key, startVal, endVal, diff, pct };
            });

            return { startLabel, endLabel, deltas };
        },
        [delta.startIdx, delta.endIdx]
    );

    return {
        delta,
        onMouseDown,
        onMouseMove,
        onMouseUp,
        onTouchStart,
        onTouchMove,
        onTouchEnd,
        clear,
        computeDelta,
    };
}

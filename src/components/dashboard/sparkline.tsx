"use client";

import { useState } from "react";
import { motion } from "motion/react";

interface SparklineProps {
    data: number[];
    labels?: string[];
    formatter?: (n: number) => string;
    width?: number;
    height?: number;
    color?: string;
    strokeWidth?: number;
}

export function Sparkline({
    data,
    labels,
    formatter,
    width = 100,
    height = 28,
    color = "currentColor",
    strokeWidth = 1.5,
}: SparklineProps) {
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

    if (data.length < 2) return null;

    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    const padding = 2;

    const coords = data.map((v, i) => {
        const x = padding + (i / (data.length - 1)) * (width - padding * 2);
        const y = padding + (1 - (v - min) / range) * (height - padding * 2);
        return { x, y, value: v };
    });

    const pathD = `M ${coords.map((c) => `${c.x},${c.y}`).join(" L ")}`;

    const fmt = formatter ?? ((n: number) => n.toLocaleString());

    return (
        <div className="relative group cursor-pointer">
            <svg
                viewBox={`0 0 ${width} ${height}`}
                width={width}
                height={height}
                className="overflow-visible"
                onMouseLeave={() => setHoveredIdx(null)}
            >
                <motion.path
                    d={pathD}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
                />
                {/* Dot on last point */}
                <motion.circle
                    cx={coords[coords.length - 1].x}
                    cy={coords[coords.length - 1].y}
                    r={2}
                    fill={color}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1.3, type: "spring", stiffness: 500 }}
                />
                {/* Hover hit areas + highlight dots */}
                {coords.map((c, i) => (
                    <g key={i}>
                        <rect
                            x={c.x - width / data.length / 2}
                            y={0}
                            width={width / data.length}
                            height={height}
                            fill="transparent"
                            onMouseEnter={() => setHoveredIdx(i)}
                        />
                        {hoveredIdx === i && (
                            <circle cx={c.x} cy={c.y} r={3} fill={color} opacity={0.8} />
                        )}
                    </g>
                ))}
            </svg>

            {/* Tooltip */}
            {hoveredIdx !== null && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded-md border-2 border-border bg-card px-2 py-1 shadow-lg z-50 pointer-events-none">
                    <p className="text-[10px] font-mono font-bold">{fmt(data[hoveredIdx])}</p>
                    {labels?.[hoveredIdx] && (
                        <p className="text-[9px] text-muted-foreground font-mono">
                            {labels[hoveredIdx]}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

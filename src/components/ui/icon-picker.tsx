"use client";

import { useState } from "react";
import {
    ShoppingCart,
    Home,
    Car,
    Utensils,
    Zap,
    Wifi,
    Heart,
    GraduationCap,
    Plane,
    Film,
    Music,
    Dumbbell,
    ShoppingBag,
    Coffee,
    Fuel,
    Bus,
    Train,
    Smartphone,
    Monitor,
    Gift,
    Baby,
    Dog,
    Scissors,
    Wrench,
    Briefcase,
    Building,
    Landmark,
    CreditCard,
    TrendingUp,
    Lamp,
    Bike,
    HeartPulse,
    Bed,
    Shirt,
    MoreHorizontal,
    Phone,
    Shield,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const CATEGORY_ICONS: { name: string; icon: LucideIcon }[] = [
    { name: "shopping-cart", icon: ShoppingCart },
    { name: "home", icon: Home },
    { name: "car", icon: Car },
    { name: "utensils", icon: Utensils },
    { name: "zap", icon: Zap },
    { name: "wifi", icon: Wifi },
    { name: "heart", icon: Heart },
    { name: "graduation-cap", icon: GraduationCap },
    { name: "plane", icon: Plane },
    { name: "film", icon: Film },
    { name: "music", icon: Music },
    { name: "dumbbell", icon: Dumbbell },
    { name: "shopping-bag", icon: ShoppingBag },
    { name: "coffee", icon: Coffee },
    { name: "fuel", icon: Fuel },
    { name: "bus", icon: Bus },
    { name: "train", icon: Train },
    { name: "smartphone", icon: Smartphone },
    { name: "monitor", icon: Monitor },
    { name: "gift", icon: Gift },
    { name: "baby", icon: Baby },
    { name: "dog", icon: Dog },
    { name: "scissors", icon: Scissors },
    { name: "wrench", icon: Wrench },
    { name: "briefcase", icon: Briefcase },
    { name: "building", icon: Building },
    { name: "landmark", icon: Landmark },
    { name: "credit-card", icon: CreditCard },
    { name: "trending-up", icon: TrendingUp },
    { name: "lamp", icon: Lamp },
    { name: "bike", icon: Bike },
    { name: "heart-pulse", icon: HeartPulse },
    { name: "bed", icon: Bed },
    { name: "shirt", icon: Shirt },
    { name: "more-horizontal", icon: MoreHorizontal },
    { name: "phone", icon: Phone },
    { name: "shield", icon: Shield },
];

const ICON_MAP = new Map(CATEGORY_ICONS.map((i) => [i.name, i.icon]));

export function getCategoryIcon(name: string | null | undefined): LucideIcon | null {
    if (!name) return null;
    return ICON_MAP.get(name) ?? null;
}

interface IconPickerProps {
    value: string | null;
    onChange: (icon: string | null) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
    const [open, setOpen] = useState(false);

    return (
        <div className="space-y-1.5">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-md border-2 transition-colors",
                    value ? "border-primary bg-primary/10" : "border-border hover:border-primary"
                )}
            >
                {value ? (
                    (() => {
                        const Icon = getCategoryIcon(value);
                        return Icon ? (
                            <Icon className="h-4 w-4" />
                        ) : (
                            <span className="text-xs">?</span>
                        );
                    })()
                ) : (
                    <span className="text-[10px] text-muted-foreground">Icon</span>
                )}
            </button>

            {open && (
                <div className="grid grid-cols-7 gap-1 rounded-md border-2 border-border bg-card p-2 shadow-[2px_2px_0px_0px] shadow-border/50">
                    {/* None option */}
                    <button
                        type="button"
                        onClick={() => {
                            onChange(null);
                            setOpen(false);
                        }}
                        className={cn(
                            "flex h-8 w-8 items-center justify-center rounded transition-colors text-[10px]",
                            !value ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                        )}
                        title="None"
                    >
                        ✕
                    </button>
                    {CATEGORY_ICONS.map(({ name, icon: Icon }) => (
                        <button
                            key={name}
                            type="button"
                            onClick={() => {
                                onChange(name);
                                setOpen(false);
                            }}
                            className={cn(
                                "flex h-8 w-8 items-center justify-center rounded transition-colors",
                                value === name
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:bg-muted"
                            )}
                            title={name}
                        >
                            <Icon className="h-4 w-4" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

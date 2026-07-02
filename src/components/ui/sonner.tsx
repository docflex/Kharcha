"use client";

import { useTheme } from "@/components/providers/theme-provider";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import {
    CircleCheckIcon,
    InfoIcon,
    TriangleAlertIcon,
    OctagonXIcon,
    Loader2Icon,
} from "lucide-react";

const Toaster = ({ ...props }: ToasterProps) => {
    const { theme = "system" } = useTheme();

    return (
        <Sonner
            theme={theme as ToasterProps["theme"]}
            className="toaster group"
            icons={{
                success: <CircleCheckIcon className="size-4" />,
                info: <InfoIcon className="size-4" />,
                warning: <TriangleAlertIcon className="size-4" />,
                error: <OctagonXIcon className="size-4" />,
                loading: <Loader2Icon className="size-4 animate-spin" />,
            }}
            style={
                {
                    "--normal-bg": "var(--popover)",
                    "--normal-text": "var(--popover-foreground)",
                    "--normal-border": "var(--border)",
                    "--border-radius": "var(--radius)",
                } as React.CSSProperties
            }
            toastOptions={{
                classNames: {
                    toast: "cn-toast !border-2 !border-border !shadow-[3px_3px_0px_0px] !shadow-border/50 !font-sans",
                    title: "!font-bold !text-sm",
                    description: "!font-mono !text-xs",
                    success: "!border-green-500/50 !bg-green-500/5",
                    error: "!border-destructive/50 !bg-destructive/5",
                },
            }}
            {...props}
        />
    );
};

export { Toaster };

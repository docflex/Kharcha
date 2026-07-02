"use client";

import { Component, type ReactNode } from "react";
import { AlertCircle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex flex-col items-center justify-center gap-4 py-20 px-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-destructive bg-destructive/10">
                        <AlertCircle className="h-8 w-8 text-destructive" />
                    </div>
                    <div className="text-center">
                        <h2 className="text-lg font-black uppercase tracking-wide">
                            Something went wrong
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1 max-w-md">
                            {this.state.error?.message || "An unexpected error occurred."}
                        </p>
                    </div>
                    <Button
                        onClick={this.handleReset}
                        variant="outline"
                        className="font-bold gap-1.5"
                    >
                        <RefreshCcw className="h-4 w-4" strokeWidth={2.5} />
                        Try Again
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}

import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { ErrorBoundary } from "@/components/layout/error-boundary";
import { CurrencyProvider } from "@/contexts/currency-context";
import { QuickAddFab } from "@/components/dashboard/quick-add-fab";
import { OnboardingGate } from "@/components/onboarding/onboarding-gate";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { MobileMonthNav } from "@/components/layout/mobile-month-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const session = await auth();

    if (!session?.user) {
        redirect("/auth/login");
    }

    return (
        <CurrencyProvider>
            <OnboardingGate>
                <div className="flex h-full min-h-screen">
                    <Sidebar user={session.user} />
                    <div className="flex min-w-0 flex-1 flex-col">
                        <Header user={session.user} />
                        <main className="flex-1 overflow-x-hidden p-4 pb-36 md:p-6 md:pb-6">
                            <ErrorBoundary>{children}</ErrorBoundary>
                        </main>
                    </div>
                    <BottomNav />
                    <MobileMonthNav />
                    <QuickAddFab />
                    <InstallPrompt />
                </div>
            </OnboardingGate>
        </CurrencyProvider>
    );
}

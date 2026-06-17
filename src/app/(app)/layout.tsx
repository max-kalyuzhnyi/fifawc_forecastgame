import { AppLiveRefresh } from "@/shared/ui/AppLiveRefresh";
import { AppNav } from "@/shared/ui/AppNav";
import { BottomTabBar } from "@/shared/ui/BottomTabBar";
import { isAdmin, isCardsEnabledForCurrentUser } from "@/shared/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [admin, cardsEnabled] = await Promise.all([
    isAdmin(),
    isCardsEnabledForCurrentUser(),
  ]);

  return (
    <AppLiveRefresh>
      <div className="app-vh flex flex-col overflow-hidden">
        <AppNav />
        <main className="mx-auto flex w-full max-w-md min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 pt-2 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))]">
          {children}
        </main>
        <BottomTabBar isAdmin={admin} cardsEnabled={cardsEnabled} />
      </div>
    </AppLiveRefresh>
  );
}

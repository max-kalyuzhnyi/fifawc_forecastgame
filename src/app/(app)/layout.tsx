import { AppNav } from "@/shared/ui/AppNav";
import { BottomTabBar } from "@/shared/ui/BottomTabBar";
import { isAdmin } from "@/shared/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await isAdmin();

  return (
    <div className="flex min-h-full flex-col">
      <AppNav />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-1 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
        {children}
      </main>
      <BottomTabBar isAdmin={admin} />
    </div>
  );
}

import { AppNav } from "@/shared/ui/AppNav";
import { isAdmin } from "@/shared/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await isAdmin();

  return (
    <>
      <AppNav isAdmin={admin} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}

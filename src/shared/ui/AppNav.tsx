import Link from "next/link";
import { signOut } from "@/features/auth/actions";

interface AppNavProps {
  isAdmin?: boolean;
}

export function AppNav({ isAdmin }: AppNavProps) {
  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/matches" className="text-lg font-bold text-emerald-700">
          WC 2026 Forecast
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/matches" className="hover:text-emerald-600">
            Matches
          </Link>
          <Link href="/leaderboard" className="hover:text-emerald-600">
            Leaderboard
          </Link>
          {isAdmin && (
            <Link href="/admin" className="hover:text-emerald-600">
              Admin
            </Link>
          )}
          <form action={signOut}>
            <button type="submit" className="text-zinc-500 hover:text-zinc-800">
              Sign out
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}

import Link from "next/link";
import { LoginForm } from "@/features/auth/ui/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-full flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-emerald-700">WC 2026 Forecast</h1>
        <p className="mt-1 text-sm text-zinc-500">Sign in to make your picks</p>
      </div>
      <LoginForm />
      <p className="mt-6 text-sm text-zinc-500">
        No account?{" "}
        <Link href="/signup" className="text-emerald-600 hover:underline">
          Sign up
        </Link>
      </p>
    </main>
  );
}

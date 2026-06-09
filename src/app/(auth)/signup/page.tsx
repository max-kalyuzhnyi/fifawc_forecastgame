import Link from "next/link";
import { SignUpForm } from "@/features/auth/ui/SignUpForm";

export default function SignUpPage() {
  return (
    <main className="flex min-h-full flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-emerald-700">WC 2026 Forecast</h1>
        <p className="mt-1 text-sm text-zinc-500">Create your account</p>
      </div>
      <SignUpForm />
      <p className="mt-6 text-sm text-zinc-500">
        Already have an account?{" "}
        <Link href="/login" className="text-emerald-600 hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}

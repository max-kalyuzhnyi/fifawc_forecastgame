import Image from "next/image";
import { TelegramLogin } from "@/features/auth/ui/TelegramLogin";

export default function LoginPage() {
  return (
    <main className="flex min-h-full flex-col items-center justify-center px-4 py-12">
      <div className="flex flex-col items-center gap-6">
        <div
          className="relative size-24 shrink-0 overflow-hidden rounded-full animate-login-logo-pulse"
          aria-hidden
        >
          <Image
            src="/fifa-logo.png"
            alt=""
            fill
            className="object-contain"
            sizes="96px"
            priority
          />
        </div>
        <TelegramLogin />
      </div>
    </main>
  );
}

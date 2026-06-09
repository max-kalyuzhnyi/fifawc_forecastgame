import Image from "next/image";
import { ThemeToggle } from "@/shared/ui/ThemeToggle";

export function AppNav() {
  return (
    <header className="glass safe-top sticky top-0 z-40 border-b border-border/50">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-2.5">
        <div
          className="relative size-9 shrink-0 overflow-hidden rounded-full"
          aria-hidden
        >
          <Image
            src="/fifa-logo.png"
            alt=""
            fill
            className="object-contain"
            sizes="36px"
            priority
          />
        </div>

        <ThemeToggle />
      </div>
    </header>
  );
}

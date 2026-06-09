import Image from "next/image";
import { signOut } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/shared/ui/ThemeToggle";
import { HugeiconsIcon } from "@hugeicons/react";
import { Logout01Icon } from "@hugeicons/core-free-icons";

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

        <div className="flex items-center gap-0.5">
          <ThemeToggle />
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              size="icon-sm"
              aria-label="Sign out"
            >
              <HugeiconsIcon icon={Logout01Icon} />
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}

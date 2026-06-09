import { signOut } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/shared/ui/ThemeToggle";
import { HugeiconsIcon } from "@hugeicons/react";
import { FootballIcon, Logout01Icon } from "@hugeicons/core-free-icons";

export function AppNav() {
  return (
    <header className="glass safe-top sticky top-0 z-40 border-b border-border/50">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-2.5">
        <div
          className="flex size-9 items-center justify-center rounded-full bg-primary/20 text-primary"
          aria-hidden
        >
          <HugeiconsIcon icon={FootballIcon} />
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

import Image from "next/image";
import { BracketNavTrigger } from "@/features/brackets/ui/BracketNavTrigger";

export function AppNav() {
  return (
    <header className="safe-top shrink-0 z-40">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-2.5">
        <BracketNavTrigger />
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
        <div className="size-9 shrink-0" aria-hidden />
      </div>
    </header>
  );
}

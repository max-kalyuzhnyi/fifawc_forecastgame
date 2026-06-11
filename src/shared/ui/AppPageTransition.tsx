"use client";

import { usePathname } from "next/navigation";

export function AppPageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div
      key={pathname}
      className="app-page-enter flex flex-col motion-reduce:animate-none"
    >
      {children}
    </div>
  );
}

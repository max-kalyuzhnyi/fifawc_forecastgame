import { cn } from "@/lib/utils";

/** Bracket fork icon: two left nodes feeding one right node. */
export function BracketViewIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <rect x="1" y="3" width="6" height="3" rx="1.5" fill="currentColor" />
      <rect x="1" y="14" width="6" height="3" rx="1.5" fill="currentColor" />
      <rect x="13" y="8.5" width="6" height="3" rx="1.5" fill="currentColor" />
      <path
        d="M7 4.5 H10 V9.5 H13"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 15.5 H10 V10.5 H13"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

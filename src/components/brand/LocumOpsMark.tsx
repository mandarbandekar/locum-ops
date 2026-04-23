import { cn } from '@/lib/utils';

interface LocumOpsMarkProps {
  className?: string;
}

/**
 * LocumOps emblem — abstract paw-pad + leaf hybrid in teal.
 * Inherits color from currentColor so it can be themed with text-primary.
 */
export function LocumOpsMark({ className }: LocumOpsMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('text-primary', className)}
      aria-hidden="true"
    >
      {/* Leaf base — rounded organic shape */}
      <path
        d="M16 29c-7 0-12-5-12-12C4 9 10 3 17 3c5 0 9 3 11 7-2 1-3 3-3 5 0 3 2 5 5 5-1 5-6 9-14 9z"
        fill="currentColor"
        fillOpacity="0.18"
      />
      {/* Leaf vein / stem */}
      <path
        d="M9 22c3-4 7-7 12-9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeOpacity="0.55"
      />
      {/* Paw — main pad */}
      <ellipse cx="16" cy="19" rx="4.2" ry="3.6" fill="currentColor" />
      {/* Paw — toe beans */}
      <circle cx="11" cy="13.5" r="1.7" fill="currentColor" />
      <circle cx="15" cy="11" r="1.9" fill="currentColor" />
      <circle cx="19.5" cy="12" r="1.8" fill="currentColor" />
      <circle cx="22" cy="15.5" r="1.6" fill="currentColor" />
    </svg>
  );
}

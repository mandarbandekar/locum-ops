import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  w?: string | number;
  h?: string | number;
  rounded?: string;
}

export function Skeleton({ className, w, h, rounded = "rounded-md", style, ...rest }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn("m-skeleton", rounded, className)}
      style={{ width: w, height: h, ...style }}
      {...rest}
    />
  );
}

export function MobileMetricsSkeleton({ count = 4, cols = 2 }: { count?: number; cols?: 2 | 3 }) {
  return (
    <div className={cn("m-gutter grid gap-3", cols === 3 ? "grid-cols-3" : "grid-cols-2")}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="mobile-card p-3">
          <Skeleton h={10} w="55%" />
          <Skeleton h={18} w="70%" className="mt-2" />
          <Skeleton h={8} w="40%" className="mt-2" />
        </div>
      ))}
    </div>
  );
}

export function MobileListSkeleton({
  count = 4,
  lines = 2,
  withAvatar = false,
}: {
  count?: number;
  lines?: 1 | 2 | 3;
  withAvatar?: boolean;
}) {
  return (
    <div className="m-gutter space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="mobile-card p-4 flex items-start gap-3">
          {withAvatar && <Skeleton h={36} w={36} rounded="rounded-full" />}
          <div className="flex-1 space-y-2">
            <Skeleton h={12} w="60%" />
            {lines >= 2 && <Skeleton h={10} w="40%" />}
            {lines >= 3 && <Skeleton h={10} w="50%" />}
          </div>
          <Skeleton h={14} w={50} />
        </div>
      ))}
    </div>
  );
}

export function MobileSectionSkeleton({ title = true }: { title?: boolean }) {
  return (
    <div className="m-gutter mt-5">
      {title && <Skeleton h={10} w={90} className="mb-2" />}
      <div className="mobile-card p-4 space-y-2">
        <Skeleton h={14} w="80%" />
        <Skeleton h={10} w="50%" />
        <Skeleton h={10} w="65%" />
      </div>
    </div>
  );
}

import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-[8px] border border-[hsl(var(--input-border))] bg-[hsl(var(--input-bg))] px-3 py-2.5 text-[14px] text-[hsl(var(--input-text))] ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-[hsl(var(--input-placeholder))] focus-visible:outline-none focus-visible:border-[hsl(var(--input-focus-border))] focus-visible:shadow-[0_0_0_3px_hsl(var(--input-focus-ring))] disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-150",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };

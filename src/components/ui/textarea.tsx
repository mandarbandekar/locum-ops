import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-[8px] border border-[hsl(var(--input-border))] bg-[hsl(var(--input-bg))] px-3 py-2.5 text-[14px] text-[hsl(var(--input-text))] ring-offset-background placeholder:text-[hsl(var(--input-placeholder))] focus-visible:outline-none focus-visible:border-[hsl(var(--input-focus-border))] focus-visible:shadow-[0_0_0_3px_hsl(var(--input-focus-ring))] disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-150",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };

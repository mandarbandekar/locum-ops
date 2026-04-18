import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-[hsl(var(--btn-primary-bg))] text-[hsl(var(--btn-primary-text))] shadow-soft hover:bg-primary-800 active:scale-[0.98]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-[hsl(var(--btn-ghost-border))] bg-transparent text-[hsl(var(--btn-ghost-text))] hover:bg-primary-50",
        secondary: "bg-[hsl(var(--btn-secondary-bg))] text-[hsl(var(--btn-secondary-text))] border border-[hsl(var(--btn-secondary-border))] hover:opacity-90",
        ghost: "bg-transparent text-[hsl(var(--btn-ghost-text))] border border-[hsl(var(--btn-ghost-border))] hover:bg-primary-50",
        link: "text-[hsl(var(--btn-ghost-text))] underline-offset-4 hover:underline",
        accent: "bg-[hsl(var(--btn-accent-bg))] text-[hsl(var(--btn-accent-text))] shadow-soft hover:opacity-90 active:scale-[0.98]",
      },
      size: {
        default: "h-10 px-5 py-2.5",
        sm: "h-9 rounded-lg px-3.5",
        lg: "h-11 rounded-lg px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none border border-transparent text-sm font-semibold ring-offset-background transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 active:translate-y-px disabled:pointer-events-none disabled:opacity-55 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_img]:h-4 [&_img]:w-4 [&_img]:shrink-0 [&_img]:object-contain",
  {
    variants: {
      variant: {
        default: "border-primary/60 bg-primary text-primary-foreground shadow-glow hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-[0_0_0_1px_hsl(var(--accent)/0.24),0_18px_34px_-24px_hsl(var(--accent)/0.42)] active:translate-y-px",
        destructive: "border-destructive/60 bg-destructive text-destructive-foreground hover:-translate-y-0.5 hover:brightness-110 active:translate-y-px",
        outline: "border-border bg-black/0 text-foreground hover:-translate-y-0.5 hover:border-accent/45 hover:bg-secondary/85 hover:text-foreground active:bg-secondary",
        secondary: "border-border/80 bg-secondary text-secondary-foreground hover:-translate-y-0.5 hover:border-primary/35 hover:bg-secondary/92 active:bg-secondary",
        ghost: "border-transparent text-muted-foreground hover:-translate-y-0.5 hover:border-border hover:bg-secondary/75 hover:text-foreground active:bg-secondary/90",
        link: "text-primary underline-offset-4 hover:underline",
        hero: "border-primary/60 bg-primary text-primary-foreground shadow-glow hover:-translate-y-0.5 hover:border-accent/70 hover:shadow-[0_0_0_1px_hsl(var(--accent)/0.24),0_20px_40px_-26px_hsl(var(--primary)/0.6)] active:translate-y-px",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-none px-3",
        lg: "h-11 rounded-none px-8",
        xl: "h-14 rounded-none px-8 text-base [&_svg]:size-5",
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

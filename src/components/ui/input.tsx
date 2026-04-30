import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-none border border-input bg-[linear-gradient(180deg,hsl(0_0%_10%_/_0.94),hsl(0_0%_7%_/_0.96))] px-3.5 py-2 text-base text-foreground ring-offset-background transition-smooth file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground hover:border-accent/40 hover:bg-[linear-gradient(180deg,hsl(0_0%_11%_/_0.96),hsl(0_0%_8%_/_0.98))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
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

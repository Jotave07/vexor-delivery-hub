import * as React from "react";

import { cn } from "@/lib/utils";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[96px] w-full rounded-none border border-input bg-[linear-gradient(180deg,hsl(0_0%_10%_/_0.94),hsl(0_0%_7%_/_0.96))] px-3.5 py-2.5 text-sm ring-offset-background transition-smooth placeholder:text-muted-foreground hover:border-accent/40 hover:bg-[linear-gradient(180deg,hsl(0_0%_11%_/_0.96),hsl(0_0%_8%_/_0.98))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };

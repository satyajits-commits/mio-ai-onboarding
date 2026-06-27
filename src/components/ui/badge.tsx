import * as React from "react";
import { cn } from "@/lib/cn";

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-mio-200 bg-mio-50 px-3 py-1 text-xs font-medium text-mio-600 dark:border-mio-800 dark:bg-mio-900/40 dark:text-mio-300",
        className
      )}
      {...props}
    />
  );
}

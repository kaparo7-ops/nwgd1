import { forwardRef } from "react";
import { cn } from "@/utils/cn";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        className
      )}
      {...props}
    />
  )
);

Input.displayName = "Input";

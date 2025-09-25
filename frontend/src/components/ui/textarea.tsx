import { forwardRef } from "react";
import { cn } from "@/utils/cn";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        className
      )}
      {...props}
    />
  )
);

Textarea.displayName = "Textarea";

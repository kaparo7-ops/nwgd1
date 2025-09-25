import { cn } from "@/utils/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-4 w-full animate-shimmer rounded-full bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%]",
        className
      )}
    />
  );
}

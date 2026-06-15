import { HelpCircle } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type TermHintProps = {
  label: ReactNode;
  description: string;
  className?: string;
  tooltipClassName?: string;
};

export function TermHint({ label, description, className, tooltipClassName }: TermHintProps) {
  return (
    <span className={cn("group relative inline-flex items-center gap-1.5", className)} title={description}>
      <span>{label}</span>
      <HelpCircle className="size-3.5 shrink-0 opacity-70" aria-hidden="true" />
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-0 top-full z-30 mt-2 hidden w-64 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs font-medium normal-case leading-5 tracking-normal text-slate-700 shadow-lg group-hover:block group-focus-within:block",
          tooltipClassName,
        )}
      >
        {description}
      </span>
    </span>
  );
}

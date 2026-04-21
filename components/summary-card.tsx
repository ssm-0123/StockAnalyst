import { ArrowRight, Clock3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SummaryCardProps {
  label: string;
  value: string;
  detail?: string;
  tone?: "default" | "positive" | "caution" | "neutral";
  isTimestamp?: boolean;
  compact?: boolean;
}

export function SummaryCard({
  label,
  value,
  detail,
  tone = "default",
  isTimestamp = false,
  compact = false,
}: SummaryCardProps) {
  return (
    <Card className="overflow-hidden border-white/70 bg-white/85 backdrop-blur">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</p>
          <Badge
            variant={
              tone === "positive"
                ? "positive"
                : tone === "caution"
                  ? "caution"
                  : tone === "neutral"
                    ? "neutral"
                    : "accent"
            }
          >
            {isTimestamp ? <Clock3 className="mr-1 size-3" /> : <ArrowRight className="mr-1 size-3" />}
            최신
          </Badge>
        </div>
        <div className="space-y-1">
          <p
            className={cn(
              "font-semibold tracking-tight text-slate-950",
              compact ? "text-lg leading-6" : "text-2xl",
              isTimestamp && "text-lg",
            )}
          >
            {value}
          </p>
          {detail ? <p className="text-xs leading-5 text-slate-500">{detail}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

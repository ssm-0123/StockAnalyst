import { Landmark, Newspaper, TrendingUp, Waypoints } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DailyAnalysis } from "@/lib/types";

const icons = {
  macro: Landmark,
  policy: Newspaper,
  earnings: TrendingUp,
  flows: Waypoints,
} as const;

const keys: Array<keyof DailyAnalysis["reasons"]> = ["macro", "policy", "earnings", "flows"];

export function ReasonPanel({ reasons }: Pick<DailyAnalysis, "reasons">) {
  return (
    <div className="grid gap-3 lg:grid-cols-4">
      {keys.map((key) => {
        const block = reasons[key];
        const Icon = icons[key];

        return (
          <Card key={key} className="border-slate-200/90 bg-slate-50/90">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">{block.title}</CardTitle>
                <div className="rounded-2xl bg-slate-100 p-2 text-slate-600">
                  <Icon className="size-4" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                {block.summary.slice(0, 3).map((line, index) => (
                  <p key={`${key}-summary-${index}`} className="text-sm leading-5 text-slate-600">
                    {line}
                  </p>
                ))}
              </div>
              {block.affectedSectors?.length ? (
                <div className="flex flex-wrap gap-2">
                  {block.affectedSectors.slice(0, 3).map((sector, index) => (
                    <Badge key={`${key}-sector-${index}-${sector}`} variant="neutral">
                      {sector}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

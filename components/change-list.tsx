import {
  ArrowDownCircle,
  ArrowUpCircle,
  CirclePlus,
  MinusCircle,
  Sparkles,
  Waves,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangeEvent } from "@/lib/types";

const iconMap = {
  upgrade: ArrowUpCircle,
  downgrade: ArrowDownCircle,
  "new-stock": CirclePlus,
  "removed-stock": MinusCircle,
  "new-theme": Sparkles,
  "fading-theme": Waves,
} as const;

const toneMap = {
  upgrade: "bg-emerald-50 text-emerald-700",
  downgrade: "bg-rose-50 text-rose-700",
  "new-stock": "bg-cyan-50 text-cyan-700",
  "removed-stock": "bg-slate-100 text-slate-700",
  "new-theme": "bg-amber-50 text-amber-700",
  "fading-theme": "bg-slate-100 text-slate-700",
} as const;

const groupTitles = {
  upgrade: "상향 섹터",
  downgrade: "하향 섹터",
  "new-stock": "신규 종목",
  "removed-stock": "제외 종목",
  "new-theme": "부상 테마",
  "fading-theme": "약화 테마",
} as const;

export function ChangeList({ changes }: { changes: ChangeEvent[] }) {
  const grouped = changes.reduce<Record<string, ChangeEvent[]>>((acc, change) => {
    const key = change.type;
    acc[key] = [...(acc[key] ?? []), change];
    return acc;
  }, {});

  return (
    <Card className="border-white/70 bg-white/90">
      <CardHeader className="pb-4">
        <CardTitle>어제 대비 변화</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 lg:grid-cols-2">
          {(Object.keys(groupTitles) as Array<keyof typeof groupTitles>).map((type) => {
            const entries = grouped[type] ?? [];
            if (!entries.length) {
              return null;
            }

            return (
              <div key={type} className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {groupTitles[type]}
                </p>
                <div className="space-y-2.5">
                  {entries.map((change, index) => {
                    const Icon = iconMap[change.type];

                    return (
                      <div key={`${change.type}-${change.title}-${index}`} className="flex gap-3">
                        <div className={`mt-0.5 rounded-xl p-2 ${toneMap[change.type]}`}>
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{change.title}</p>
                          <p className="line-clamp-1 text-sm text-slate-500">{change.detail}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

import { FinanceStatKeys, FinanceStatsType, attributes } from "@/constants/morals";

const STAT_ORDER: FinanceStatKeys[] = [
  FinanceStatKeys.risk,
  FinanceStatKeys.compliance,
  FinanceStatKeys.thriftiness,
  FinanceStatKeys.anomaly_sensitivity,
];

export function MoralStats({
  moralStats,
}: {
  moralStats: FinanceStatsType;
}) {
  return (
    <div className="flex flex-col w-full">
      {STAT_ORDER.map((key, index) => {
        const value = moralStats[key];
        const attr = attributes[key];
        const label = value > 50 ? attr.high : attr.low;
        const isLast = index === STAT_ORDER.length - 1;

        return (
          <div
            key={key}
            className={`flex items-center w-full ${!isLast ? "border-b-2" : ""}`}
            style={{ height: "2.25rem" }}
          >
            {/* Stat label */}
            <div className="w-24 shrink-0 text-xs text-zinc-600 px-2 truncate border-r-2 h-full flex items-center bg-zinc-100">
              {label}
            </div>

            {/* Bar fill */}
            <div className="flex-1 h-full relative">
              <div className="w-full h-full">
                <div
                  className="bg-zinc-500 h-full"
                  style={{ width: `${value}%` }}
                />
              </div>
              <div className="absolute right-2 top-0 h-full flex items-center">
                <span className="text-xs text-zinc-700">{Math.round(value)}%</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Re-export with finance name
export const FinanceStats = MoralStats;

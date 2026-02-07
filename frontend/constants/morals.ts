// Finance stats range from 0-100
export enum FinanceStatKeys {
  risk = "risk",
  compliance = "compliance",
  thriftiness = "thriftiness",
  anomaly_sensitivity = "anomaly_sensitivity",
}

export type FinanceStatsType = Record<FinanceStatKeys, number>;

export const DEFAULT_FINANCE_STATS: FinanceStatsType = {
  risk: 50,
  compliance: 50,
  thriftiness: 50,
  anomaly_sensitivity: 50,
};

export type FinanceStatAttribute =
  | "risk-averse"
  | "risk-tolerant"
  | "lenient"
  | "strict"
  | "spender"
  | "thrifty"
  | "oblivious"
  | "vigilant";

export const attributes: Record<
  FinanceStatKeys,
  { low: FinanceStatAttribute; high: FinanceStatAttribute }
> = {
  [FinanceStatKeys.risk]: {
    low: "risk-averse",
    high: "risk-tolerant",
  },
  [FinanceStatKeys.compliance]: {
    low: "lenient",
    high: "strict",
  },
  [FinanceStatKeys.thriftiness]: {
    low: "spender",
    high: "thrifty",
  },
  [FinanceStatKeys.anomaly_sensitivity]: {
    low: "oblivious",
    high: "vigilant",
  },
};

type StatWritten = {
  key: string;
  description: string;
  percentage: number;
  value: number;
};

export function parseFinanceStats(stats: FinanceStatsType): StatWritten[] {
  return Object.entries(stats).reduce((acc, [key, value]) => {
    const range = attributes[key as FinanceStatKeys];
    if (!range) return acc;
    const description = value > 50 ? range.high : range.low;
    acc.push({
      key,
      description,
      percentage: Math.abs(value - 50) * 2,
      value,
    });
    return acc;
  }, [] as StatWritten[]);
}

export function getFinanceStatsWritten(stats: FinanceStatsType): StatWritten[] {
  const parsed = parseFinanceStats(stats);

  const written = parsed.map((stat) => {
    let prefix = "";
    if (stat.value > 75 || stat.value < 25) {
      prefix = "highly ";
    } else if (stat.value > 60 || stat.value < 40) {
      prefix = "moderately ";
    }
    return {
      ...stat,
      description: `${prefix}${stat.description}`,
    };
  });

  return written.sort(
    (a, b) => Math.abs(b.value - 50) - Math.abs(a.value - 50)
  );
}

// Legacy aliases — kept for any straggling imports
export const MoralDimensions = FinanceStatKeys;
export type MoralDimensionsType = FinanceStatsType;
export type MoralStatAttribute = FinanceStatAttribute;
export const DEFAULT_AVERAGE_STATS = DEFAULT_FINANCE_STATS;
export const parseMoralStats = parseFinanceStats;
export const getMoralStatsWritten = getFinanceStatsWritten;

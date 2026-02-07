import { EvolutionId, getEvolutionTimeFrame } from "@/constants/evolutions";
import { DEFAULT_FINANCE_STATS, FinanceStatsType, getMoralStatsWritten } from "@/constants/morals";
import { ActiveDilemma, Pet } from "@/app/storage/pet";

export function getAverageMoralStats(
  dilemmas: ActiveDilemma[]
): FinanceStatsType {
  const stats = { ...DEFAULT_FINANCE_STATS };
  const counts = { risk: 1, compliance: 1, thriftiness: 1, anomaly_sensitivity: 1 };

  for (const dilemma of dilemmas) {
    if (!dilemma.stats) continue;
    for (const key of Object.keys(dilemma.stats)) {
      const k = key as keyof FinanceStatsType;
      stats[k] += dilemma.stats[k];
      counts[k]++;
    }
  }

  const result = { ...DEFAULT_FINANCE_STATS };
  for (const key of Object.keys(stats)) {
    const k = key as keyof FinanceStatsType;
    result[k] = counts[k] > 0 ? stats[k] / counts[k] : 50;
  }

  return result;
}

function evolveToStage1(
  statsWritten: { key: string; description: string; percentage: number }[]
): EvolutionId {
  for (const stat of statsWritten) {
    if (stat.description.includes("thrifty")) return EvolutionId.PENNY_PINCHER;
    if (stat.description.includes("strict")) return EvolutionId.RULE_FOLLOWER;
    if (stat.description.includes("risk-tolerant")) return EvolutionId.RISK_TAKER;
    if (stat.description.includes("vigilant")) return EvolutionId.WATCHDOG;
  }
  return EvolutionId.NPC;
}

function evolveToStage2(
  currentId: EvolutionId,
  statsWritten: { key: string; description: string; percentage: number }[]
): EvolutionId {
  const dominant = statsWritten[0]?.description || "";

  switch (currentId) {
    case EvolutionId.PENNY_PINCHER:
      return dominant.includes("strict")
        ? EvolutionId.BUDGET_SAGE
        : EvolutionId.FORENSIC_ACCOUNTANT;
    case EvolutionId.RULE_FOLLOWER:
      return dominant.includes("risk-tolerant")
        ? EvolutionId.CHIEF_RISK_OFFICER
        : EvolutionId.COMPLIANCE_GUARDIAN;
    case EvolutionId.RISK_TAKER:
      return dominant.includes("thrifty")
        ? EvolutionId.HEDGE_FUND_HAWK
        : EvolutionId.CHIEF_RISK_OFFICER;
    case EvolutionId.WATCHDOG:
      return dominant.includes("strict")
        ? EvolutionId.VIGILANT_AUDITOR
        : EvolutionId.FRAUD_DETECTIVE;
    case EvolutionId.WILD_CARD:
      return EvolutionId.FRAUD_DETECTIVE;
    case EvolutionId.BEAN_COUNTER:
      return EvolutionId.FORENSIC_ACCOUNTANT;
    default:
      return EvolutionId.SIGMA;
  }
}

export function evolvePetIfNeeded(
  resolvedCount: number,
  pet: Pet,
  averageStats: FinanceStatsType
): { evolutionId: EvolutionId; age: number } | undefined {
  const timeFrame = getEvolutionTimeFrame(pet.age);
  if (resolvedCount < timeFrame) return;

  const currentId =
    pet.evolutionIds?.[pet.evolutionIds.length - 1] || EvolutionId.BABY;
  const statsWritten = getMoralStatsWritten(averageStats);

  let newEvolutionId: EvolutionId | undefined;
  if (pet.age === 0) {
    newEvolutionId = evolveToStage1(statsWritten);
  } else if (pet.age === 1) {
    newEvolutionId = evolveToStage2(currentId, statsWritten);
  } else {
    return;
  }

  if (!newEvolutionId) return;

  return { evolutionId: newEvolutionId, age: pet.age + 1 };
}

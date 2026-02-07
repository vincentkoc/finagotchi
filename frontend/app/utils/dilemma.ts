import { dilemmas } from "@/constants/dilemmas";
import { Pet, ActiveDilemma } from "@/app/storage/pet";
import { FinanceStatsType } from "@/constants/morals";

// get a random unseen dilemma
export const getRandomUnseenDilemma = (pet: Pet): ActiveDilemma | null => {
  const seenDilemmas = pet.dilemmas.map((d) => d.id) || [];
  const unseenDilemmas = Object.keys(dilemmas).filter(
    (title) => !seenDilemmas.includes(title)
  );

  if (unseenDilemmas.length === 0) return null;

  const randomTitle =
    unseenDilemmas[Math.floor(Math.random() * unseenDilemmas.length)];
  return {
    id: randomTitle,
    messages: [],
    completed: false,
    stats: {
      risk: 0,
      compliance: 0,
      thriftiness: 0,
      anomaly_sensitivity: 0,
    },
  };
};

// Format finance stats changes for display
export const formatMoralStatsChange = (
  oldStats: FinanceStatsType,
  newStats: FinanceStatsType
): string[] => {
  const changes: string[] = [];

  Object.entries(newStats).forEach(([key, newValue]) => {
    const oldValue = oldStats[key as keyof FinanceStatsType];
    const diff = newValue - oldValue;

    if (Math.abs(diff) > 0.5) {
      const sign = diff > 0 ? "+" : "";
      const label = key.replace("_", " ");
      changes.push(`${sign}${Math.round(diff)} ${label}`);
    }
  });

  return changes;
};

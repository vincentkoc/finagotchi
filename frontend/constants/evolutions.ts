import { FinanceStatKeys, MoralStatAttribute, attributes } from "./morals";

// evolution time frames (dilemma count thresholds)
const evolutionTimeFrame = {
  0: 3, // baby -> stage 1 after 3 interactions
  1: 5, // stage 1 -> stage 2 after 5 interactions
  2: 7, // graduation unlocks
};

export function getEvolutionTimeFrame(age: number): number {
  return evolutionTimeFrame[age as keyof typeof evolutionTimeFrame] ?? 7;
}

// evolution types - finance themed
export enum EvolutionId {
  // Base
  BABY = "baby",

  // Stage 1
  PENNY_PINCHER = "penny pinscher",
  RULE_FOLLOWER = "rule follower",
  RISK_TAKER = "risk taker",
  WATCHDOG = "watchdog",
  BEAN_COUNTER = "bean counter",
  WILD_CARD = "wild card",
  NPC = "npc",

  // Stage 2
  VIGILANT_AUDITOR = "vigilant auditor",
  CHIEF_RISK_OFFICER = "chief risk officer",
  FORENSIC_ACCOUNTANT = "forensic accountant",
  COMPLIANCE_GUARDIAN = "compliance guardian",
  HEDGE_FUND_HAWK = "hedge fund hawk",
  BUDGET_SAGE = "budget sage",
  FRAUD_DETECTIVE = "fraud detective",
  SIGMA = "sigma",

  // Final
  GRADUATED = "graduated",
  RIP = "rip",
}

export type Stage1EvolutionId =
  | EvolutionId.PENNY_PINCHER
  | EvolutionId.RULE_FOLLOWER
  | EvolutionId.RISK_TAKER
  | EvolutionId.WATCHDOG
  | EvolutionId.BEAN_COUNTER
  | EvolutionId.WILD_CARD
  | EvolutionId.NPC;

export type Stage2EvolutionId =
  | EvolutionId.VIGILANT_AUDITOR
  | EvolutionId.CHIEF_RISK_OFFICER
  | EvolutionId.FORENSIC_ACCOUNTANT
  | EvolutionId.COMPLIANCE_GUARDIAN
  | EvolutionId.HEDGE_FUND_HAWK
  | EvolutionId.BUDGET_SAGE
  | EvolutionId.FRAUD_DETECTIVE
  | EvolutionId.NPC
  | EvolutionId.SIGMA;

export type EvolutionIdType =
  | EvolutionId.BABY
  | Stage1EvolutionId
  | Stage2EvolutionId;

type Stage0Evolution = {
  id: "baby";
  description: string;
  nextStages: Partial<Record<MoralStatAttribute, Stage1EvolutionId>>;
};

type Stage1Evolution = {
  id: Stage1EvolutionId;
  description: string;
  nextStages: Partial<Record<MoralStatAttribute, Stage2EvolutionId>>;
};

type Stage2Evolution = {
  id: Stage2EvolutionId;
  description: string;
};

type Stage3Evolution = {
  id: "graduated";
  description: string;
};

export type Evolution =
  | Stage0Evolution
  | Stage1Evolution
  | Stage2Evolution
  | Stage3Evolution;

export const stage0Evolutions: Record<EvolutionId.BABY, Stage0Evolution> = {
  [EvolutionId.BABY]: {
    id: EvolutionId.BABY,
    description: "fresh intern learning the ropes of finance",
    nextStages: {
      [attributes[FinanceStatKeys.thriftiness].high]: EvolutionId.PENNY_PINCHER,
      [attributes[FinanceStatKeys.compliance].high]: EvolutionId.RULE_FOLLOWER,
      [attributes[FinanceStatKeys.risk].high]: EvolutionId.RISK_TAKER,
      [attributes[FinanceStatKeys.anomaly_sensitivity].high]:
        EvolutionId.WATCHDOG,
    },
  },
};

export const stage1Evolutions: Record<Stage1EvolutionId, Stage1Evolution> = {
  [EvolutionId.PENNY_PINCHER]: {
    id: EvolutionId.PENNY_PINCHER,
    description: "cost-conscious analyst who questions every expense",
    nextStages: {
      [attributes[FinanceStatKeys.compliance].high]:
        EvolutionId.BUDGET_SAGE,
      [attributes[FinanceStatKeys.anomaly_sensitivity].high]:
        EvolutionId.FORENSIC_ACCOUNTANT,
    },
  },
  [EvolutionId.RULE_FOLLOWER]: {
    id: EvolutionId.RULE_FOLLOWER,
    description: "policy-driven processor who follows every regulation",
    nextStages: {
      [attributes[FinanceStatKeys.risk].high]:
        EvolutionId.CHIEF_RISK_OFFICER,
      [attributes[FinanceStatKeys.anomaly_sensitivity].high]:
        EvolutionId.COMPLIANCE_GUARDIAN,
    },
  },
  [EvolutionId.RISK_TAKER]: {
    id: EvolutionId.RISK_TAKER,
    description:
      "bold decision-maker comfortable with uncertainty and high stakes",
    nextStages: {
      [attributes[FinanceStatKeys.thriftiness].high]:
        EvolutionId.HEDGE_FUND_HAWK,
      [attributes[FinanceStatKeys.compliance].high]:
        EvolutionId.CHIEF_RISK_OFFICER,
    },
  },
  [EvolutionId.WATCHDOG]: {
    id: EvolutionId.WATCHDOG,
    description:
      "sharp-eyed monitor who spots anomalies others miss",
    nextStages: {
      [attributes[FinanceStatKeys.compliance].high]:
        EvolutionId.VIGILANT_AUDITOR,
      [attributes[FinanceStatKeys.risk].high]:
        EvolutionId.FRAUD_DETECTIVE,
    },
  },
  [EvolutionId.BEAN_COUNTER]: {
    id: EvolutionId.BEAN_COUNTER,
    description: "meticulous number-cruncher focused on accuracy",
    nextStages: {
      [attributes[FinanceStatKeys.anomaly_sensitivity].high]:
        EvolutionId.FORENSIC_ACCOUNTANT,
      [attributes[FinanceStatKeys.thriftiness].high]:
        EvolutionId.BUDGET_SAGE,
    },
  },
  [EvolutionId.WILD_CARD]: {
    id: EvolutionId.WILD_CARD,
    description: "unpredictable analyst with unconventional methods",
    nextStages: {
      [attributes[FinanceStatKeys.anomaly_sensitivity].high]:
        EvolutionId.FRAUD_DETECTIVE,
      [attributes[FinanceStatKeys.risk].low]:
        EvolutionId.SIGMA,
    },
  },
  [EvolutionId.NPC]: {
    id: EvolutionId.NPC,
    description: "ordinary finance worker finding their way",
    nextStages: {
      [attributes[FinanceStatKeys.compliance].high]:
        EvolutionId.COMPLIANCE_GUARDIAN,
      [attributes[FinanceStatKeys.thriftiness].high]:
        EvolutionId.BUDGET_SAGE,
    },
  },
};

export const stage2Evolutions: Record<string, Stage2Evolution> = {
  [EvolutionId.VIGILANT_AUDITOR]: {
    id: EvolutionId.VIGILANT_AUDITOR,
    description: "eagle-eyed auditor ensuring compliance across the board",
  },
  [EvolutionId.CHIEF_RISK_OFFICER]: {
    id: EvolutionId.CHIEF_RISK_OFFICER,
    description: "strategic leader balancing risk and opportunity",
  },
  [EvolutionId.FORENSIC_ACCOUNTANT]: {
    id: EvolutionId.FORENSIC_ACCOUNTANT,
    description: "financial detective uncovering hidden discrepancies",
  },
  [EvolutionId.COMPLIANCE_GUARDIAN]: {
    id: EvolutionId.COMPLIANCE_GUARDIAN,
    description: "steadfast enforcer of regulatory standards",
  },
  [EvolutionId.HEDGE_FUND_HAWK]: {
    id: EvolutionId.HEDGE_FUND_HAWK,
    description: "aggressive optimizer maximizing returns while cutting waste",
  },
  [EvolutionId.BUDGET_SAGE]: {
    id: EvolutionId.BUDGET_SAGE,
    description: "wise steward of organizational resources",
  },
  [EvolutionId.FRAUD_DETECTIVE]: {
    id: EvolutionId.FRAUD_DETECTIVE,
    description: "relentless investigator hunting financial fraud",
  },
  [EvolutionId.NPC]: {
    id: EvolutionId.NPC,
    description: "steady finance professional content with routine",
  },
  [EvolutionId.SIGMA]: {
    id: EvolutionId.SIGMA,
    description: "lone wolf analyst charting an independent course",
  },
};

export const evolutions: Record<string, Evolution> = {
  ...stage0Evolutions,
  ...stage1Evolutions,
  ...stage2Evolutions,
};

export function getEvolution(id: EvolutionId): Evolution {
  if (!(id in evolutions)) {
    return evolutions.npc;
  }
  return evolutions[id];
}

export const evolutionToStat: Record<string, string> = {
  [EvolutionId.PENNY_PINCHER]: "high thriftiness",
  [EvolutionId.RULE_FOLLOWER]: "high compliance",
  [EvolutionId.RISK_TAKER]: "high risk tolerance",
  [EvolutionId.WATCHDOG]: "high anomaly sensitivity",
  [EvolutionId.BEAN_COUNTER]: "balanced precision",
  [EvolutionId.WILD_CARD]: "unpredictable methods",
  [EvolutionId.NPC]: "balanced traits",
  [EvolutionId.VIGILANT_AUDITOR]: "high compliance + high anomaly sensitivity",
  [EvolutionId.CHIEF_RISK_OFFICER]: "high risk + high compliance",
  [EvolutionId.FORENSIC_ACCOUNTANT]:
    "high thriftiness + high anomaly sensitivity",
  [EvolutionId.COMPLIANCE_GUARDIAN]: "high compliance + high vigilance",
  [EvolutionId.HEDGE_FUND_HAWK]: "high risk + high thriftiness",
  [EvolutionId.BUDGET_SAGE]: "high thriftiness + high compliance",
  [EvolutionId.FRAUD_DETECTIVE]: "high anomaly sensitivity + high risk",
  [EvolutionId.SIGMA]: "independent strategist",
  [EvolutionId.BABY]: "developing traits",
  [EvolutionId.GRADUATED]: "mastered finance",
  [EvolutionId.RIP]: "failed to thrive",
};

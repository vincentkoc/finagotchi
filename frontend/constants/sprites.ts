import {
  EvolutionId,
  Stage1EvolutionId,
  Stage2EvolutionId,
} from "./evolutions";

export enum Animation {
  IDLE = "idle",
  HAPPY = "happy",
}

export const RIP_SPRITE = "/birb/rip.png";

// Re-use existing bird sprites but map them to new finance evolution IDs
// Stage 1 maps: penny_pincher->empath, rule_follower->devout, risk_taker->soldier,
//   watchdog->watcher, bean_counter->tp, wild_card->hedonist, npc->npc
// Stage 2 maps: vigilant_auditor->gavel, chief_risk_officer->vigilante,
//   forensic_accountant->saint, compliance_guardian->guardian,
//   hedge_fund_hawk->godfather, budget_sage->aristocrat,
//   fraud_detective->sigma, sigma->sigma, npc->old
const SPRITES: {
  0: Record<Animation, Record<"baby", string>>;
  1: Record<Animation, Record<Stage1EvolutionId, string>>;
  2: Record<Animation, Record<Stage2EvolutionId, string>>;
} = {
  0: {
    [Animation.IDLE]: {
      baby: "/birb/smol_idle.gif",
    },
    [Animation.HAPPY]: {
      baby: "/birb/smol_happy.gif",
    },
  },
  1: {
    [Animation.IDLE]: {
      [EvolutionId.PENNY_PINCHER]: "/birb/empath_idle.gif",
      [EvolutionId.RULE_FOLLOWER]: "/birb/devout_idle.gif",
      [EvolutionId.RISK_TAKER]: "/birb/soldier_idle.gif",
      [EvolutionId.WATCHDOG]: "/birb/watcher_idle.gif",
      [EvolutionId.BEAN_COUNTER]: "/birb/tp_idle.gif",
      [EvolutionId.WILD_CARD]: "/birb/hedonist_idle.gif",
      [EvolutionId.NPC]: "/birb/mid_happy.gif",
    },
    [Animation.HAPPY]: {
      [EvolutionId.PENNY_PINCHER]: "/birb/empath_happy.gif",
      [EvolutionId.RULE_FOLLOWER]: "/birb/devout_happy.gif",
      [EvolutionId.RISK_TAKER]: "/birb/soldier_happy.gif",
      [EvolutionId.WATCHDOG]: "/birb/watcher_happy.gif",
      [EvolutionId.BEAN_COUNTER]: "/birb/tp_happy.gif",
      [EvolutionId.WILD_CARD]: "/birb/hedonist_happy.gif",
      [EvolutionId.NPC]: "/birb/mid_happy.gif",
    },
  },
  2: {
    [Animation.IDLE]: {
      [EvolutionId.VIGILANT_AUDITOR]: "/birb/gavel_idle.gif",
      [EvolutionId.CHIEF_RISK_OFFICER]: "/birb/vigilante_idle.gif",
      [EvolutionId.FORENSIC_ACCOUNTANT]: "/birb/saint_idle.gif",
      [EvolutionId.COMPLIANCE_GUARDIAN]: "/birb/guardian_idle.gif",
      [EvolutionId.HEDGE_FUND_HAWK]: "/birb/godfather_idle.gif",
      [EvolutionId.BUDGET_SAGE]: "/birb/aristocrat_idle.gif",
      [EvolutionId.FRAUD_DETECTIVE]: "/birb/cult_idle.gif",
      [EvolutionId.SIGMA]: "/birb/sigma_idle.gif",
      [EvolutionId.NPC]: "/birb/old_idle.gif",
    },
    [Animation.HAPPY]: {
      [EvolutionId.VIGILANT_AUDITOR]: "/birb/gavel_happy.gif",
      [EvolutionId.CHIEF_RISK_OFFICER]: "/birb/vigilante_happy.gif",
      [EvolutionId.FORENSIC_ACCOUNTANT]: "/birb/saint_happy.gif",
      [EvolutionId.COMPLIANCE_GUARDIAN]: "/birb/guardian_happy.gif",
      [EvolutionId.HEDGE_FUND_HAWK]: "/birb/godfather_happy.gif",
      [EvolutionId.BUDGET_SAGE]: "/birb/aristocrat_happy.gif",
      [EvolutionId.FRAUD_DETECTIVE]: "/birb/cult_happy.gif",
      [EvolutionId.SIGMA]: "/birb/sigma_happy.gif",
      [EvolutionId.NPC]: "/birb/old_happy.gif",
    },
  },
};

export function getSprite(animation: Animation, evolution: EvolutionId) {
  if (evolution === "baby") {
    return SPRITES[0][animation].baby;
  }

  const evolutionId = evolution.includes("_")
    ? (evolution.split("_")[0] as EvolutionId)
    : (evolution as EvolutionId);

  if (Object.keys(SPRITES[1][animation]).includes(evolutionId)) {
    return SPRITES[1][animation][evolutionId as Stage1EvolutionId];
  } else if (Object.keys(SPRITES[2][animation]).includes(evolutionId)) {
    return SPRITES[2][animation][evolutionId as Stage2EvolutionId];
  } else {
    return SPRITES[1][animation].npc;
  }
}

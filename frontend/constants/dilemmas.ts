// Finance dilemmas for the Finagotchi pet
export interface Dilemma {
  id: string;
  text: string;
}

export const dilemmas: Record<string, Dilemma> = {
  // Vendor & procurement
  vendor_discount: {
    id: "vendor_discount",
    text: "vendor V-4421 is offering a 40% bulk discount but requires a 2-year lock-in. {pet} needs to decide: take the discount or maintain flexibility?",
  },
  duplicate_invoice: {
    id: "duplicate_invoice",
    text: "{pet} found what looks like a duplicate invoice from supplier S-1187 for $12,450. the amounts match but the dates are 3 days apart. flag it or approve?",
  },
  rush_payment: {
    id: "rush_payment",
    text: "the CFO wants {pet} to rush-approve a $85,000 payment to a new vendor with no prior history. the purchase order looks legitimate but there's no three-quote comparison. what should {pet} do?",
  },
  split_purchase: {
    id: "split_purchase",
    text: "{pet} notices a department split a $52,000 purchase into three separate orders under $18,000 each — conveniently below the approval threshold. investigate or let it slide?",
  },

  // Expense & reimbursement
  travel_expense: {
    id: "travel_expense",
    text: "an executive submitted $4,200 in travel expenses including a $380 dinner for two. the receipt is from a Michelin-star restaurant. {pet} needs to decide: approve, flag, or reject?",
  },
  personal_charge: {
    id: "personal_charge",
    text: "{pet} spots a $67 Amazon charge on a corporate card that looks personal — baby items. the employee has never had a compliance issue before. how should {pet} handle it?",
  },
  late_receipt: {
    id: "late_receipt",
    text: "a senior manager submitted 3 months of backlogged expenses totaling $8,900 with missing receipts for 40% of items. policy says reject after 30 days, but the manager claims extenuating circumstances.",
  },

  // Transaction monitoring
  round_numbers: {
    id: "round_numbers",
    text: "{pet} detected a pattern: 15 transactions to the same vendor, all exactly $9,999 — just under the $10,000 reporting threshold. suspicious or coincidence?",
  },
  foreign_transfer: {
    id: "foreign_transfer",
    text: "a $340,000 wire transfer to an offshore account just cleared. it's tagged as 'consulting services' but the receiving entity was incorporated 2 weeks ago. {pet} has 30 minutes to decide.",
  },
  weekend_activity: {
    id: "weekend_activity",
    text: "{pet} noticed unusual weekend transaction activity: 23 purchase orders approved between 2-4 AM Saturday. the approver's credentials check out. escalate or monitor?",
  },

  // Budget & allocation
  budget_overrun: {
    id: "budget_overrun",
    text: "department D-7 is 15% over budget with 2 months remaining in the fiscal year. they're requesting an additional $120,000 for a 'critical' project. {pet} needs to advise: approve, cut elsewhere, or deny?",
  },
  year_end_spend: {
    id: "year_end_spend",
    text: "it's December 28th. three departments just submitted rush orders totaling $450,000 — classic 'use it or lose it' year-end spending. should {pet} approve to preserve next year's budget allocation?",
  },

  // Compliance & policy
  policy_exception: {
    id: "policy_exception",
    text: "a VP is requesting an exception to the travel policy to fly business class on a 3-hour domestic flight. they claim a medical condition but haven't provided documentation. approve the exception?",
  },
  whistleblower_tip: {
    id: "whistleblower_tip",
    text: "{pet} received an anonymous tip that a procurement officer has a side business with one of the company's top vendors. no hard evidence yet. investigate formally or gather more info quietly?",
  },
  audit_finding: {
    id: "audit_finding",
    text: "during a routine check, {pet} found that 12% of vendor contracts lack proper documentation. fixing it would delay $2M in pending payments. report immediately or fix quietly?",
  },

  // Risk assessment
  new_vendor_risk: {
    id: "new_vendor_risk",
    text: "a new vendor offers services 30% cheaper than the incumbent. however, their financial health score is borderline and they've only been in business 8 months. recommend switching?",
  },
  insurance_gap: {
    id: "insurance_gap",
    text: "{pet} discovered the company's cyber insurance doesn't cover a new cloud service handling sensitive financial data. coverage would cost $45,000/year. is it worth it?",
  },

  // Data & anomalies
  data_mismatch: {
    id: "data_mismatch",
    text: "{pet} found a $23,000 discrepancy between the general ledger and the accounts payable subledger. it could be a timing difference or an actual error. how deep should {pet} dig?",
  },
  ghost_employee: {
    id: "ghost_employee",
    text: "payroll audit reveals an employee ID receiving direct deposits for 6 months — but HR has no record of this person. the deposits total $47,000. {pet} needs to act fast.",
  },

  // Demo-friendly quick scenarios
  coffee_machine: {
    id: "coffee_machine",
    text: "someone ordered a $3,200 espresso machine on the office supplies budget. technically it's under the approval limit. should {pet} question it?",
  },
};

export type DilemmaTemplate = Dilemma;
export const dilemmaTemplates = dilemmas;

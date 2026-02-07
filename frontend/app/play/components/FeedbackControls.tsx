"use client";

import { motion } from "framer-motion";

type FeedbackAction = "approve" | "flag" | "escalate" | "reject";

const ACTIONS: { action: FeedbackAction; label: string; color: string }[] = [
  { action: "approve", label: "Approve", color: "bg-emerald-100 hover:bg-emerald-200 border-emerald-400" },
  { action: "flag", label: "Flag", color: "bg-amber-100 hover:bg-amber-200 border-amber-400" },
  { action: "escalate", label: "Escalate", color: "bg-orange-100 hover:bg-orange-200 border-orange-400" },
  { action: "reject", label: "Reject", color: "bg-red-100 hover:bg-red-200 border-red-400" },
];

export default function FeedbackControls({
  onFeedback,
  decision,
}: {
  onFeedback: (action: FeedbackAction) => void;
  decision: string | null;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-1 border-2 border-black p-2 bg-zinc-50"
    >
      <p className="text-sm text-zinc-600">
        {decision
          ? `pet suggests: ${decision}. do you agree?`
          : "provide your feedback:"}
      </p>
      <div className="flex gap-2 flex-wrap">
        {ACTIONS.map(({ action, label, color }) => (
          <button
            key={action}
            onClick={() => onFeedback(action)}
            className={`border-2 px-3 py-1 text-sm transition-colors ${color} ${
              decision === action ? "ring-2 ring-black" : ""
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

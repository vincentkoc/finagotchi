import { getFinanceStatsWritten, FinanceStatsType } from "@/constants/morals";
import { motion, AnimatePresence } from "framer-motion";

export function MoralStats({
  moralStats,
}: {
  moralStats: FinanceStatsType;
}) {
  const statsWritten = getFinanceStatsWritten(moralStats);

  return (
    <div
      className="flex flex-col text-right sm:w-50 min-h-30 text-lg"
      style={{ zIndex: -2 }}
    >
      <AnimatePresence mode="popLayout">
        {statsWritten.length ? (
          statsWritten.map(({ key, description, percentage }) => (
            <motion.span
              key={key}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              title={`${Math.round(percentage)}%`}
              className={`${
                percentage >= 50
                  ? "text-teal-700"
                  : percentage >= 25
                    ? "text-zinc-700"
                    : percentage >= 10
                      ? "text-zinc-500"
                      : "text-zinc-400"
              }`}
            >
              {description} {Math.round(percentage)}%
            </motion.span>
          ))
        ) : (
          <motion.span
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-zinc-700 animate-pulse no-select"
          >
            calibrating sensors...
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

// Re-export with finance name
export const FinanceStats = MoralStats;

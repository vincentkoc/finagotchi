import { useBaseStats, useDilemma, useOutcome, usePet } from "@/app/providers/PetProvider";
import { formatMoralStatsChange } from "@/app/utils/dilemma";
import { BaseStatKeys } from "@/constants/base";
import { DEFAULT_FINANCE_STATS, FinanceStatsType } from "@/constants/morals";
import { postQA, postFeedback } from "@/lib/api";
import { useState, useCallback } from "react";

// Local state for graph data, shared via window event
function emitGraphUpdate(data: { neighborhood: unknown; overlay: unknown }) {
  window.dispatchEvent(
    new CustomEvent("finagotchi:graph-update", { detail: data })
  );
}

function emitEvidenceUpdate(data: unknown) {
  window.dispatchEvent(
    new CustomEvent("finagotchi:evidence-update", { detail: data })
  );
}

export function useDilemmaSubmit() {
  const { pet, updatePet } = usePet();
  const { dilemma, setDilemma } = useDilemma();
  const { incrementStat, incrementStatBy } = useBaseStats();
  const { showOutcome } = useOutcome();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastInteractionId, setLastInteractionId] = useState<string | null>(
    null
  );
  const [lastAnswerDecision, setLastAnswerDecision] = useState<string | null>(
    null
  );

  const handleSubmit = useCallback(
    async (responseText: string) => {
      if (!pet || !dilemma) return;

      setIsSubmitting(true);
      const newMessages = [
        ...dilemma.messages,
        { role: "user" as const, content: responseText },
      ];
      const newDilemma = { ...dilemma, messages: newMessages };
      setDilemma(newDilemma);

      try {
        // Call backend /qa endpoint — pass dilemma context + evidence IDs for exact matching
        const qaResponse = await postQA(
          responseText,
          pet.id,
          dilemma.context,
          dilemma.evidence_ids
        );

        // Emit graph and evidence updates for the graph panel
        emitGraphUpdate({
          neighborhood: qaResponse.neighborhood_graph,
          overlay: qaResponse.overlay_graph,
        });
        emitEvidenceUpdate(qaResponse.evidence_bundle);

        // Store interaction ID for feedback
        if (qaResponse.interaction_id) {
          setLastInteractionId(qaResponse.interaction_id);
        }
        setLastAnswerDecision(qaResponse.answer_json.decision);

        // Build the response message
        const { answer_json } = qaResponse;
        const evidenceText = qaResponse.evidence_bundle
          .slice(0, 3)
          .map((e) => {
            const shortId = e.id?.split(":").pop()?.slice(0, 8) || "?";
            return `[${shortId}]`;
          })
          .join(" ");
        const assistantMessage = `decision: ${answer_json.decision} (confidence: ${Math.round(answer_json.confidence * 100)}%)\n\n${answer_json.rationale}\n\nevidence: ${evidenceText}`;

        const updatedDilemma = {
          ...dilemma,
          messages: [
            ...newMessages,
            { role: "assistant" as const, content: assistantMessage },
          ],
        };
        setDilemma(updatedDilemma);

        // Update pet stats from backend response
        const newStats: FinanceStatsType = {
          ...DEFAULT_FINANCE_STATS,
          ...qaResponse.pet_stats,
        };
        const statsChanges = formatMoralStatsChange(pet.moralStats, newStats)
          .join(", ")
          .trim();

        updatePet({
          moralStats: newStats,
          personality: `${answer_json.decision} specialist with ${Math.round(answer_json.confidence * 100)}% confidence`,
        });

        incrementStatBy(BaseStatKeys.sanity, 1.5);

        if (statsChanges) {
          showOutcome("success", `${answer_json.decision}: ${statsChanges}`);
        }
      } catch (error) {
        console.error("Error calling backend:", error);

        // Fallback: simulate a local response when backend is unavailable
        const fallbackDecisions = [
          "approve",
          "flag",
          "reject",
          "escalate",
        ] as const;
        const decision =
          fallbackDecisions[
            Math.floor(Math.random() * fallbackDecisions.length)
          ];
        const confidence = 0.5 + Math.random() * 0.4;

        const decisionVerb =
          decision === "approve" ? "approved"
            : decision === "flag" ? "flagged"
            : decision === "reject" ? "rejected"
            : "escalated";
        const assistantMessage = `decision: ${decision} (confidence: ${Math.round(confidence * 100)}%)\n\n[offline mode] based on the available information, this transaction should be ${decisionVerb}. further review recommended when backend is available.\n\nevidence: [local analysis]`;

        const updatedDilemma = {
          ...dilemma,
          messages: [
            ...newMessages,
            { role: "assistant" as const, content: assistantMessage },
          ],
        };
        setDilemma(updatedDilemma);

        // Apply local stat changes
        const statDeltas: Record<string, Partial<FinanceStatsType>> = {
          approve: { thriftiness: 3, risk: -2 },
          flag: { risk: 3, compliance: 3 },
          escalate: { risk: 5, compliance: 5 },
          reject: { compliance: 3 },
        };

        const delta = statDeltas[decision] || {};
        const newStats = { ...pet.moralStats };
        Object.entries(delta).forEach(([key, value]) => {
          const k = key as keyof FinanceStatsType;
          newStats[k] = Math.max(
            0,
            Math.min(100, newStats[k] + (value as number))
          );
        });

        updatePet({ moralStats: newStats });
        setLastAnswerDecision(decision);
        incrementStat(BaseStatKeys.sanity);
        showOutcome(
          "success",
          `[offline] ${decision} (${Math.round(confidence * 100)}%)`
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      pet,
      dilemma,
      setDilemma,
      updatePet,
      incrementStat,
      incrementStatBy,
      showOutcome,
    ]
  );

  const handleFeedback = useCallback(
    async (action: "approve" | "flag" | "escalate" | "reject") => {
      if (!pet || !dilemma) return;

      try {
        if (lastInteractionId) {
          const feedbackResponse = await postFeedback(
            lastInteractionId,
            action
          );

          // Update graph
          emitGraphUpdate({
            neighborhood: null,
            overlay: feedbackResponse.overlay_graph_delta,
          });

          // Update pet stats
          const newStats: FinanceStatsType = {
            ...DEFAULT_FINANCE_STATS,
            ...feedbackResponse.updated_pet_stats,
          };
          const statsChanges = formatMoralStatsChange(pet.moralStats, newStats)
            .join(", ")
            .trim();

          updatePet({
            moralStats: newStats,
            dilemmas: [
              ...pet.dilemmas,
              { ...dilemma, completed: true, stats: newStats },
            ],
          });

          showOutcome(
            "success",
            `feedback: ${action}${statsChanges ? ` (${statsChanges})` : ""}`
          );
        } else {
          // No interaction ID (offline mode) - apply local stat changes
          const statDeltas: Record<string, Partial<FinanceStatsType>> = {
            approve: { thriftiness: 3, risk: -2 },
            flag: { risk: 3, compliance: 3 },
            escalate: { risk: 5, compliance: 5 },
            reject: { compliance: 3 },
          };

          const delta = statDeltas[action] || {};
          const newStats = { ...pet.moralStats };
          Object.entries(delta).forEach(([key, value]) => {
            const k = key as keyof FinanceStatsType;
            newStats[k] = Math.max(
              0,
              Math.min(100, newStats[k] + (value as number))
            );
          });

          updatePet({
            moralStats: newStats,
            dilemmas: [
              ...pet.dilemmas,
              { ...dilemma, completed: true, stats: newStats },
            ],
          });

          showOutcome("success", `feedback: ${action}`);
        }
      } catch (error) {
        console.error("Feedback error:", error);
        showOutcome("error", "failed to send feedback");
      }

      incrementStat(BaseStatKeys.sanity);
      setDilemma(null);
      setLastInteractionId(null);
      setLastAnswerDecision(null);
    },
    [
      pet,
      dilemma,
      lastInteractionId,
      updatePet,
      showOutcome,
      incrementStat,
      setDilemma,
    ]
  );

  return {
    handleSubmit,
    handleFeedback,
    isSubmitting,
    lastAnswerDecision,
  };
}

import WindowTextarea from "@/components/WindowTextarea";
import { useDilemma, usePet } from "@/app/providers/PetProvider";
import { dilemmas } from "@/constants/dilemmas";
import { useDilemmaSubmit } from "./useDilemmaSubmit";
import FeedbackControls from "../FeedbackControls";
import { useEffect, useRef, useState, useCallback } from "react";
import { getRandomUnseenDilemma } from "@/app/utils/dilemma";
import { fetchDilemma } from "@/lib/api";

export default function Dialog() {
  const { pet } = usePet();
  const { dilemma, setDilemma } = useDilemma();
  const { handleSubmit, handleFeedback, isSubmitting, lastAnswerDecision } =
    useDilemmaSubmit();
  const hasAutoTriggered = useRef(false);
  const [isLoadingDilemma, setIsLoadingDilemma] = useState(false);

  // Reset auto-trigger when a dilemma completes (becomes null)
  useEffect(() => {
    if (!dilemma) {
      hasAutoTriggered.current = false;
    }
  }, [dilemma]);

  // Fetch a data-driven dilemma from the backend, with local fallback
  const triggerNewDilemma = useCallback(async () => {
    if (!pet || pet.age >= 2) return;

    setIsLoadingDilemma(true);
    try {
      const backendDilemma = await fetchDilemma();
      if (backendDilemma?.question) {
        setDilemma({
          id: backendDilemma.id,
          messages: [
            { role: "system", content: backendDilemma.question },
          ],
          completed: false,
          stats: { risk: 0, compliance: 0, thriftiness: 0, anomaly_sensitivity: 0 },
          context: backendDilemma.context,
          evidence_ids: backendDilemma.evidence_ids,
        });
        return;
      }
    } catch {
      // Backend unavailable — fall through to local
    }

    // Fallback: use local dilemma
    const localDilemma = getRandomUnseenDilemma(pet);
    if (localDilemma) {
      const text = dilemmas[localDilemma.id]?.text.replaceAll("{pet}", pet.name);
      setDilemma({
        ...localDilemma,
        messages: [{ role: "system", content: text || localDilemma.id }],
      });
    }
    setIsLoadingDilemma(false);
  }, [pet, setDilemma]);

  // Auto-trigger on mount
  useEffect(() => {
    if (!pet || dilemma || hasAutoTriggered.current) return;
    if (pet.age >= 2) return;

    hasAutoTriggered.current = true;
    triggerNewDilemma().finally(() => setIsLoadingDilemma(false));
  }, [pet, dilemma, triggerNewDilemma]);

  if (!pet) {
    return null;
  }

  if (isLoadingDilemma) {
    return (
      <div className="flex w-full h-50 text-lg">
        <div className="border-2 border-black p-3 bg-zinc-100 w-full flex items-center justify-center">
          <p className="text-zinc-500 italic animate-pulse">
            generating scenario from knowledge base...
          </p>
        </div>
      </div>
    );
  }

  if (!dilemma) {
    return (
      <div className="flex w-full h-50 text-lg">
        <div className="border-2 border-black p-3 bg-zinc-100 w-full flex items-center justify-center">
          <p className="text-zinc-500 italic">
            click &quot;brief agent&quot; to start a new scenario
          </p>
        </div>
      </div>
    );
  }

  // Display the first system message as the dilemma text
  const displayText =
    dilemma.messages.find((m) => m.role === "system")?.content || "";
  const placeholder = `advise ${pet.name} on this scenario...`;

  // Show feedback controls if the backend has responded with a decision
  const hasAssistantResponse = dilemma.messages.some(
    (m) => m.role === "assistant"
  );

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex w-full h-50 text-lg">
        <WindowTextarea
          key={dilemma.id}
          title={`advise ${pet.name} on this case`}
          placeholder={isSubmitting ? "analyzing..." : placeholder}
          handleSubmit={isSubmitting ? () => {} : handleSubmit}
          disabled={isSubmitting}
        >
          <p>{displayText}</p>
          {/* Show conversation history */}
          {dilemma.messages.map((msg, i) => (
            <p
              key={i}
              className={`mt-2 ${msg.role === "assistant" ? "text-teal-700 whitespace-pre-line" : "text-zinc-600"}`}
            >
              {msg.role === "assistant" ? `> ${msg.content}` : null}
            </p>
          ))}
        </WindowTextarea>
      </div>
      {hasAssistantResponse && (
        <FeedbackControls
          onFeedback={handleFeedback}
          decision={lastAnswerDecision}
        />
      )}
    </div>
  );
}

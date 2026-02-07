import WindowTextarea from "@/components/WindowTextarea";
import { useDilemma, usePet } from "@/app/providers/PetProvider";
import { dilemmas } from "@/constants/dilemmas";
import { useDilemmaSubmit } from "./useDilemmaSubmit";
import FeedbackControls from "../FeedbackControls";
import { useEffect, useRef } from "react";
import { getRandomUnseenDilemma } from "@/app/utils/dilemma";

export default function Dialog() {
  const { pet } = usePet();
  const { dilemma, setDilemma } = useDilemma();
  const { handleSubmit, handleFeedback, isSubmitting, lastAnswerDecision } =
    useDilemmaSubmit();
  const hasAutoTriggered = useRef(false);

  // Auto-trigger a scenario when there's none active
  useEffect(() => {
    if (!pet || dilemma || hasAutoTriggered.current) return;
    if (pet.age >= 2) return; // promoted pets don't get new scenarios

    hasAutoTriggered.current = true;
    const newDilemma = getRandomUnseenDilemma(pet);
    if (newDilemma) {
      setDilemma({
        ...newDilemma,
        messages: [
          {
            role: "system",
            content: dilemmas[newDilemma.id].text.replaceAll("{pet}", pet.name),
          },
        ],
      });
    }
  }, [pet, dilemma, setDilemma]);

  if (!pet) {
    return null;
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

  const displayText = dilemmas[dilemma.id]?.text.replaceAll("{pet}", pet.name);
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

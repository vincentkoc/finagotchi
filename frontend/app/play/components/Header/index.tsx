import { usePet, useHoverText } from "@/app/providers/PetProvider";
import { EvolutionId, getEvolutionTimeFrame } from "@/constants/evolutions";
import ActionButtons from "./ActionButtons";
import { useState } from "react";
import { DilemmaTracker } from "./DilemmaTracker";

export default function Header({
  onHealClick,
  onFeedClick,
  onPlayClick,
}: {
  onHealClick?: () => void;
  onFeedClick?: () => void;
  onPlayClick?: () => void;
}) {
  const { pet, evolution } = usePet();
  const { setHoverText } = useHoverText();
  const [showDilemmaTracker, setShowDilemmaTracker] = useState(false);

  if (!pet || !evolution) {
    return null;
  }

  const timeFrame = getEvolutionTimeFrame(pet.age);
  const hasPromoted = pet.age >= 2;
  const hasRip = pet.evolutionIds.includes(EvolutionId.RIP);

  return (
    <>
      <div className="flex flex-col bg-white border-2">
        <div className="flex w-full">
          <div className="w-1/3">
            <ActionButtons
              onHealClick={onHealClick}
              onFeedClick={onFeedClick}
              onPlayClick={onPlayClick}
            />
          </div>
          <div className="border-l-2 p-4 w-full text-lg flex flex-col gap-2">
            <p className="flex items-center gap-1 pointer-events-auto flex-wrap">
              &quot;{pet.name}&quot;{" "}
              {hasPromoted
                ? "was promoted as a"
                : hasRip
                  ? "was decommissioned as a"
                  : "is a"}
              <span
                className="underline hover:bg-zinc-500 hover:text-white cursor-default"
                onMouseEnter={() => setHoverText(`rank ${pet.age + 1} of 3`)}
                onMouseLeave={() => setHoverText(null)}
              >
                rank {pet.age + 1}
              </span>
              <span
                className="underline hover:bg-zinc-500 hover:text-white cursor-default"
                onMouseEnter={() => setHoverText(evolution.description)}
                onMouseLeave={() => setHoverText(null)}
              >
                {evolution.id}
              </span>
              .{" "}
              <a
                className="text-zinc-500 hover:text-zinc-700 underline cursor-pointer"
                onClick={() => setShowDilemmaTracker(true)}
                onMouseEnter={() => setHoverText("view scenario log")}
                onMouseLeave={() => setHoverText(null)}
              >
                {hasPromoted
                  ? `(${pet.dilemmas.length} scenarios reviewed)`
                  : `(${pet.dilemmas.length}/${timeFrame} scenarios until ${pet.age === 2 ? "promotion" : "next rank"})`}
              </a>
            </p>

            <p className="italic border-2 p-2 h-29 overflow-y-scroll pointer-events-auto">
              {pet.personality || "no operational profile yet."}
            </p>
          </div>
        </div>
      </div>

      <DilemmaTracker
        isOpen={showDilemmaTracker}
        setIsOpen={setShowDilemmaTracker}
      />
    </>
  );
}

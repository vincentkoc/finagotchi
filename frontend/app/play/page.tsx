"use client";

import { useState } from "react";
import Loading from "./components/Loading";
import { usePet, useHoverText } from "../providers/PetProvider";
import Viewport from "./components/Viewport";
import Dialog from "./components/Dialog";
import Header from "./components/Header";
import { MoralStats } from "./components/MoralStats";
import { AnimatePresence, motion } from "framer-motion";
import HoverText from "@/components/HoverText";
import Window from "@/components/Window";
import Menu from "@/components/Menu";
import HealMinigame from "./components/Header/HealMinigame";
import FeedMinigame from "./components/Header/FeedMinigame";
import PlayMinigame from "./components/Header/PlayMinigame";
import Outcome from "./components/Outcome";
import Graduation from "./components/Graduation";
import GraphPanel from "./components/GraphPanel";
import { EvolutionId } from "@/constants/evolutions";

// Dithered overlay for minigame modals
function DitheredOverlay({
  children,
  isOpen,
  onClose,
}: {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Dithered backdrop */}
      <div
        className="absolute inset-0"
        onClick={onClose}
        style={{
          backgroundColor: "rgba(0,0,0,0.4)",
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='4' height='4' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='0' y='0' width='2' height='2' fill='%23000' opacity='0.3'/%3E%3Crect x='2' y='2' width='2' height='2' fill='%23000' opacity='0.3'/%3E%3C/svg%3E\")",
          backgroundSize: "4px 4px",
        }}
      />
      {/* Centered minigame box */}
      <div className="relative z-10 w-full max-w-lg mx-4">
        {children}
      </div>
    </div>
  );
}

export default function Play() {
  const [graduationOpen, setGraduationOpen] = useState(false);
  const [healMinigameOpen, setHealMinigameOpen] = useState(false);
  const [feedMinigameOpen, setFeedMinigameOpen] = useState(false);
  const [playMinigameOpen, setPlayMinigameOpen] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(true);
  const { pet, evolution } = usePet();
  const { hoverText } = useHoverText();
  const hasGraduated = pet?.age !== undefined && pet.age >= 2;

  if (!pet || !evolution) {
    return (
      <div className="flex flex-col gap-2 p-4 w-full">
        <Menu page="play" />
        <div className="flex items-center justify-center h-96">
          <Loading />
        </div>
      </div>
    );
  }

  const isRip = pet.evolutionIds.includes(EvolutionId.RIP);

  return (
    <>
      <HoverText hoverText={hoverText} />
      <Outcome />

      {graduationOpen && (
        <Graduation
          pet={pet}
          graduationOpen={graduationOpen}
          setGraduationOpen={setGraduationOpen}
        />
      )}

      {/* Minigame modals */}
      <DitheredOverlay
        isOpen={healMinigameOpen}
        onClose={() => setHealMinigameOpen(false)}
      >
        <HealMinigame
          isOpen={healMinigameOpen}
          setIsOpen={setHealMinigameOpen}
        />
      </DitheredOverlay>

      <DitheredOverlay
        isOpen={feedMinigameOpen}
        onClose={() => setFeedMinigameOpen(false)}
      >
        <FeedMinigame
          isOpen={feedMinigameOpen}
          setIsOpen={setFeedMinigameOpen}
        />
      </DitheredOverlay>

      <DitheredOverlay
        isOpen={playMinigameOpen}
        onClose={() => setPlayMinigameOpen(false)}
      >
        <PlayMinigame
          isOpen={playMinigameOpen}
          setIsOpen={setPlayMinigameOpen}
        />
      </DitheredOverlay>

      <div className="flex flex-col gap-2 p-4 w-full">
        {/* Dark header bar — full width */}
        <div className="bg-zinc-900 border-2 border-black px-4 py-2">
          <Menu
            page="play"
            variant="dark"
            extra={
              <motion.a
                className="hover:text-white no-drag cursor-pointer underline"
                onClick={() => setDetailsVisible(!detailsVisible)}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.6 }}
              >
                {detailsVisible ? "hide extra" : "show extra"}
              </motion.a>
            }
          />
        </div>

        {/* Row 1: Stats header + Agent personality */}
        <div className="flex flex-col lg:flex-row gap-2">
          <motion.div
            className="w-full lg:w-1/2 pointer-events-none"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Header
              onHealClick={() => setHealMinigameOpen(true)}
              onFeedClick={() => setFeedMinigameOpen(true)}
              onPlayClick={() => setPlayMinigameOpen(true)}
            />
          </motion.div>

          <AnimatePresence>
            {detailsVisible && (
              <motion.div
                key="personality"
                className="w-full lg:w-1/2"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.2 }}
              >
                <Window title="agent personality">
                  <MoralStats moralStats={pet.moralStats} />
                </Window>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Row 2: Pet viewport + Memory graph */}
        <div className="flex flex-col lg:flex-row gap-2">
          <div className="w-full lg:w-1/2">
            <Viewport />
          </div>

          <AnimatePresence>
            {detailsVisible && (
              <motion.div
                key="graph"
                className="w-full lg:w-1/2"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.2, delay: 0.05 }}
              >
                <Window title="agent memory graph">
                  <div className="min-h-[350px] lg:min-h-[400px]">
                    <GraphPanel />
                  </div>
                </Window>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Row 3: Dialog / content — left side only */}
        <div className="w-full lg:w-1/2">
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2, delay: 0.2 }}
              className="flex flex-col gap-2 w-full"
            >
              {isRip && (
                <Window title={`${pet.name} has been decommissioned :(`}>
                  <div className="flex flex-col p-3">
                    <p>
                      maybe you should take better care of your finance agent
                      next time...
                    </p>
                    <a href="/create" className="underline">
                      recruit a new agent
                    </a>
                  </div>
                </Window>
              )}

              {hasGraduated && !isRip && (
                <motion.div
                  key="graduated"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="w-full"
                >
                  <Window title="promotion time!">
                    <div className="flex flex-col gap-1 p-3">
                      <p>
                        congratulations! after {pet.dilemmas.length} scenarios,{" "}
                        {pet.name} has earned a promotion.
                      </p>
                      <a
                        onClick={() => setGraduationOpen(true)}
                        className="underline cursor-pointer"
                      >
                        collect promotion certificate
                      </a>
                      <a href="/dossiers" className="underline">
                        view agent dossiers
                      </a>
                      <a href="/create" className="underline">
                        recruit a new agent
                      </a>
                    </div>
                  </Window>
                </motion.div>
              )}

              {!isRip && <Dialog />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}

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
  const [graphVisible, setGraphVisible] = useState(true);
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

      {/* Minigame modals — dithered overlay + centered box */}
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

      {/* Top bar: Menu + toggle */}
      <div className="flex justify-between items-center p-4 pb-0 w-full">
        <Menu page="play" />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setGraphVisible(!graphVisible)}
            className="text-xs text-zinc-400 hover:text-zinc-700 border border-zinc-300 px-2 py-0.5 hover:bg-zinc-100 whitespace-nowrap hidden lg:block"
          >
            {graphVisible ? "hide details" : "show details"}
          </button>
          <button
            onClick={() => setGraphVisible(!graphVisible)}
            className="text-xs text-zinc-400 hover:text-zinc-700 border border-zinc-300 px-2 py-0.5 hover:bg-zinc-100 whitespace-nowrap lg:hidden"
          >
            {graphVisible ? "hide details" : "show details"}
          </button>
        </div>
      </div>

      {/* Main layout — both columns start at the same level */}
      <div className="flex flex-col lg:flex-row gap-4 px-4 pb-4 pt-2 w-full">
        {/* LEFT COLUMN: Gameplay */}
        <div
          className={`flex flex-col gap-2 w-full ${graphVisible ? "lg:w-1/2 lg:max-w-2xl" : "lg:max-w-4xl lg:mx-auto"}`}
        >
          {/* Pet stats header */}
          <motion.div
            key="stats"
            className="w-full pointer-events-none"
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

          {/* Pet viewport */}
          <Viewport />

          {/* Dialog / content area */}
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

        {/* RIGHT COLUMN: Details (collapsible) */}
        {graphVisible && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="w-full lg:w-1/2 flex flex-col gap-2"
          >
            {/* Agent personality — bar style matching Header */}
            <div className="flex flex-col gap-1">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider px-1">agent personality</h3>
              <div className="border-2 border-black bg-white">
                <MoralStats moralStats={pet.moralStats} />
              </div>
            </div>

            {/* Agent memory graph */}
            <div className="flex flex-col gap-1 flex-1 min-h-[350px] lg:min-h-[450px]">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider px-1">agent memory graph</h3>
              <div className="flex-1">
                <GraphPanel />
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getPets } from "./storage/pet";
import { checkBackendHealth } from "@/lib/api";
import Window from "@/components/Window";

export default function Home() {
  const router = useRouter();
  const [activePetName, setActivePetName] = useState<string | null>(null);
  const [hasPets, setHasPets] = useState(false);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Check local pet state
    const pets = getPets();
    setHasPets(pets.length > 0);
    const active = pets.find((p) => p.age < 2);
    if (active) {
      setActivePetName(active.name);
    }

    // Check backend connectivity
    checkBackendHealth().then((online) => {
      setBackendOnline(online);
      setReady(true);
    });
  }, []);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.p
          className="text-zinc-500 text-lg"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          initializing systems...
        </motion.p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 gap-2 max-w-xl w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full flex flex-col gap-2"
      >
        {backendOnline === false && (
          <div className="border-2 border-red-400 bg-red-50 px-3 py-2 text-sm text-red-700">
            backend offline — running in cached mode with limited experience.
            scenarios will use local analysis.
          </div>
        )}

        <Window title="about">
          <div className="flex flex-col gap-3 p-4">
            <p className="text-2xl">finagotchi</p>
            <p>
              finagotchi is a memory-aware finance operations agent disguised as a
              virtual pet. raise your agent by guiding it through real-world
              financial scenarios — invoice reviews, expense audits, vendor risk
              assessments, and compliance checks.
            </p>
            <p>
              every decision you make shapes your agent&apos;s personality: will it
              become a vigilant auditor, a pragmatic risk-taker, or a meticulous
              penny pincher? your choices are remembered and influence how the
              agent evolves.
            </p>
            <p className="text-zinc-500">
              powered by local LLMs, vector memory (Qdrant), and a knowledge graph
              (Kuzu). built for hackathon vibes.
            </p>

            <div className="flex flex-col gap-2 pt-2">
              {activePetName && (
                <a
                  onClick={() => router.push("/play")}
                  className="underline cursor-pointer hover:bg-zinc-500 hover:text-white px-1"
                >
                  continue to your agent &quot;{activePetName}&quot;
                </a>
              )}

              <a
                onClick={() => router.push("/create")}
                className="underline cursor-pointer hover:bg-zinc-500 hover:text-white px-1"
              >
                {hasPets ? "recruit a new agent" : "recruit your first agent"}
              </a>

              {hasPets && (
                <a
                  onClick={() => router.push("/dossiers")}
                  className="underline cursor-pointer hover:bg-zinc-500 hover:text-white px-1"
                >
                  personnel records
                </a>
              )}
            </div>
          </div>
        </Window>
      </motion.div>
    </div>
  );
}

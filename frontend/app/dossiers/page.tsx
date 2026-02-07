"use client";

import { useEffect, useState } from "react";
import Dossiers from "./components/Dossiers";
import { getPets, clearPets, Pet } from "../storage/pet";
import Graduation from "../play/components/Graduation";
import { useRouter } from "next/navigation";

export default function DossiersPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    try {
      const loaded = getPets();
      setPets(loaded);
    } catch (error) {
      console.error("Error loading pets:", error);
      setPets([]);
    } finally {
      setIsReady(true);
    }
  }, []);

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-lg text-zinc-500">loading portfolio...</div>
      </div>
    );
  }

  const handleClear = () => {
    if (window.confirm("wipe all agent records? this cannot be undone.")) {
      clearPets();
      setPets([]);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 sm:p-0 sm:w-xl w-full">
      <div className="flex items-center justify-center gap-4 pb-2">
        <a
          className="text-zinc-500 underline hover:text-white hover:bg-zinc-500 cursor-pointer"
          onClick={() => router.push("/play")}
        >
          back to operations
        </a>
        {pets.length > 0 && (
          <button
            onClick={handleClear}
            className="text-xs text-red-400 hover:text-red-600 underline cursor-pointer"
          >
            clear all records
          </button>
        )}
      </div>
      <Dossiers pets={pets} setSelectedPet={setSelectedPet} />
      {selectedPet && (
        <Graduation
          pet={selectedPet}
          graduationOpen={selectedPet !== null}
          setGraduationOpen={() => setSelectedPet(null)}
        />
      )}
    </div>
  );
}

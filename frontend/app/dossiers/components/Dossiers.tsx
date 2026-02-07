import { evolutions } from "@/constants/evolutions";
import PetCard from "./PetCard";
import { Pet } from "@/app/storage/pet";

export default function Dossiers({
  pets,
  setSelectedPet,
}: {
  pets?: Pet[];
  setSelectedPet: (pet: Pet | null) => void;
}) {
  if (pets === undefined) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 bg-zinc-200">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="relative">
            <div className="h-60 bg-zinc-300 w-36 animate-pulse flex items-center justify-center"></div>
          </div>
        ))}
      </div>
    );
  }

  const promoted = pets.filter((pet) => pet.age >= 2);
  const active = pets.filter((pet) => pet.age < 2);

  // count number of unique evolutions collected
  const evolutionSet = new Set(
    promoted.flatMap((pet) => pet.evolutionIds)
  );
  const evolutionCount = evolutionSet.size;
  const evolutionText =
    evolutionCount === 0
      ? "no promotions yet"
      : evolutionCount === 1
        ? "1 role unlocked"
        : `${evolutionCount} roles unlocked`;

  return (
    <div className="flex flex-col gap-2 bg-zinc-200 w-full p-3 text-lg">
      <h2 className="text-zinc-800 font-bold">personnel records</h2>
      <p className="text-zinc-500 italic">
        {evolutionText} out of {Object.keys(evolutions).length} total
      </p>

      {promoted.length > 0 && (
        <>
          <p className="text-zinc-600 font-medium mt-2">promoted agents</p>
          <div className="grid grid-cols-2 sm:grid-cols-4">
            {promoted.map((pet) => (
              <div key={pet.id} className="relative">
                <PetCard pet={pet} setSelectedPet={setSelectedPet} />
              </div>
            ))}
          </div>
        </>
      )}

      {active.length > 0 && (
        <>
          <p className="text-zinc-600 font-medium mt-2">active agents</p>
          <div className="grid grid-cols-2 sm:grid-cols-4">
            {active.map((pet) => (
              <div key={pet.id} className="relative">
                <PetCard pet={pet} setSelectedPet={setSelectedPet} />
              </div>
            ))}
          </div>
        </>
      )}

      {pets.length === 0 && (
        <p className="text-zinc-500 italic">
          no agents on file yet. head to the operations desk to recruit one.
        </p>
      )}
    </div>
  );
}

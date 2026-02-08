import { EGG_CRACK_SHOWN_KEY } from "@/app/play/components/Viewport";
import { EvolutionId } from "@/constants/evolutions";
import { FinanceStatsType, DEFAULT_FINANCE_STATS } from "@/constants/morals";

type BaseStats = {
  health: number;
  hunger: number;
  happiness: number;
  sanity: number;
};

export type ActiveDilemma = {
  id: string;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  stats?: FinanceStatsType;
  completed: boolean;
  context?: string;
  evidence_ids?: string[];
};

export type Pet = {
  id: string;
  name: string;
  age: number;
  evolutionIds: EvolutionId[];
  personality: string;
  baseStats: BaseStats;
  moralStats: FinanceStatsType;
  dilemmas: ActiveDilemma[];
};

const makeId = (): string => {
  const cryptoObj = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (cryptoObj && "randomUUID" in cryptoObj) {
    return cryptoObj.randomUUID();
  }
  return `pet_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

// Debounced save function to prevent excessive localStorage writes
let saveTimeout: NodeJS.Timeout | null = null;
const debouncedSave = (key: string, data: Pet[], delay = 500) => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(() => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn(`Failed to save ${key}:`, error);
    }
  }, delay);
};

export const getPets = (): Pet[] => {
  try {
    const raw = JSON.parse(localStorage.getItem("pets") || "[]") as Pet[];
    // Deduplicate by id — keep the last (most recent) entry for each id
    const seen = new Map<string, Pet>();
    for (const pet of raw) {
      seen.set(pet.id, pet);
    }
    const pets = Array.from(seen.values());
    // Auto-fix if duplicates were found
    if (pets.length < raw.length) {
      localStorage.setItem("pets", JSON.stringify(pets));
    }
    return pets;
  } catch (error) {
    console.warn("Failed to load pets, returning empty array:", error);
    return [];
  }
};

export const createPet = async (name: string): Promise<Pet> => {
  const pets = getPets();
  const newPet: Pet = {
    id: makeId(),
    name,
    age: 0,
    evolutionIds: [EvolutionId.BABY],
    personality: "",
    baseStats: { health: 5, hunger: 5, happiness: 5, sanity: 5 },
    moralStats: { ...DEFAULT_FINANCE_STATS },
    dilemmas: [],
  };

  localStorage.removeItem(EGG_CRACK_SHOWN_KEY);
  localStorage.removeItem("poos");

  pets.push(newPet);
  debouncedSave("pets", pets, 0);
  return newPet;
};

export const savePet = (pet: Pet): void => {
  const pets = getPets();
  const idx = pets.findIndex((p) => p.id === pet.id);
  if (idx >= 0) {
    pets[idx] = pet;
  } else {
    pets.push(pet);
  }
  debouncedSave("pets", pets);
};

export const updatePet = (id: string, updates: Partial<Pet>): Pet | null => {
  const pets = getPets();
  const idx = pets.findIndex((p) => p.id === id);
  if (idx < 0) return null;

  const updatedPet = { ...pets[idx], ...updates };
  pets[idx] = updatedPet;
  debouncedSave("pets", pets);
  return updatedPet;
};

export const clearPets = (): void => {
  localStorage.removeItem("pets");
  localStorage.removeItem("poos");
  localStorage.removeItem(EGG_CRACK_SHOWN_KEY);
};

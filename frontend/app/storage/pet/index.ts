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
    const pets = JSON.parse(localStorage.getItem("pets") || "[]") as Pet[];
    return pets;
  } catch (error) {
    console.warn("Failed to load pets, returning empty array:", error);
    return [];
  }
};

export const createPet = async (name: string): Promise<Pet> => {
  const pets = getPets();
  const newPet: Pet = {
    id: crypto.randomUUID(),
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
  pets.push(pet);
  debouncedSave("pets", pets);
};

export const updatePet = (id: string, updates: Partial<Pet>): Pet | null => {
  const pets = getPets();
  const pet = pets.find((pet) => pet.id === id);
  if (!pet) return null;

  const updatedPet = { ...pet, ...updates };
  pets.push(updatedPet);
  debouncedSave("pets", pets);
  return updatedPet;
};

export const clearPets = (): void => {
  localStorage.removeItem("pets");
  localStorage.removeItem("poos");
  localStorage.removeItem(EGG_CRACK_SHOWN_KEY);
};

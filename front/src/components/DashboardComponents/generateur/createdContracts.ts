/**
 * Historique local des contrats créés « de zéro » (via le questionnaire).
 * Stocké en localStorage : on conserve le modèle complet pour pouvoir rouvrir
 * le contrat dans l'éditeur.
 */
import type { ContractModel } from "../../../contractEngine/types";

export interface CreatedContract {
  id: string;
  title: string;
  createdAt: number; // timestamp ms
  model: ContractModel;
  fileBase: string;
}

const KEY = "lumenjuris-created-contracts-v1";
const MAX = 50;

export function loadCreatedContracts(): CreatedContract[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CreatedContract[]) : [];
  } catch {
    return [];
  }
}

export function addCreatedContract(input: {
  title: string;
  model: ContractModel;
  fileBase: string;
}): CreatedContract {
  const entry: CreatedContract = {
    id: (globalThis.crypto?.randomUUID?.() ?? String(Date.now()) + Math.random().toString(36).slice(2)),
    title: input.title.trim() || "Contrat",
    createdAt: Date.now(),
    model: input.model,
    fileBase: input.fileBase,
  };
  try {
    const next = [entry, ...loadCreatedContracts()].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch { /* silent */ }
  return entry;
}

export function removeCreatedContract(id: string): void {
  try {
    const next = loadCreatedContracts().filter((c) => c.id !== id);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch { /* silent */ }
}

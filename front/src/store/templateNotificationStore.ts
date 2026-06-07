import { create } from "zustand";

interface State {
  pulse: boolean;
  pendingCount: number;
  notifyAdded: () => void;
  clearPulse: () => void;
}

/**
 * Notifie l'UI principale (sidebar) lorsqu'un nouveau modèle de contrat
 * a été ajouté. Déclenche une courte animation sur l'entrée "Contrat tech".
 */
export const useTemplateNotificationStore = create<State>((set) => ({
  pulse: false,
  pendingCount: 0,
  notifyAdded: () => {
    set((s) => ({ pulse: true, pendingCount: s.pendingCount + 1 }));
    setTimeout(() => set({ pulse: false, pendingCount: 0 }), 3000);
  },
  clearPulse: () => set({ pulse: false, pendingCount: 0 }),
}));

import { create } from "zustand";
import { fetchProxy } from "../utils/fetchProxy";

/**
 * Compteur d'alertes de veille juridique non lues — alimente la pastille de
 * la navigation (MainLayout) et se rafraîchit après chaque action sur une
 * alerte (marquer lue / ignorer).
 */
interface LegalWatchState {
  unreadCount: number;
  loaded: boolean;
  refreshUnreadCount: () => Promise<void>;
  setUnreadCount: (count: number) => void;
}

export const useLegalWatchStore = create<LegalWatchState>((set) => ({
  unreadCount: 0,
  loaded: false,
  refreshUnreadCount: async () => {
    try {
      const res = await fetchProxy("/api/legal-watch/unread-count", {
        credentials: "include",
      });
      if (!res.ok) return;
      const payload = (await res.json()) as {
        success: boolean;
        data?: { count: number };
      };
      if (payload.success && payload.data) {
        set({ unreadCount: payload.data.count, loaded: true });
      }
    } catch {
      /* silencieux : la pastille est un confort, pas une fonction critique */
    }
  },
  setUnreadCount: (count) => set({ unreadCount: count, loaded: true }),
}));

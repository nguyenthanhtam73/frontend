import { create } from "zustand";

/**
 * Session store placeholder until Auth module lands (JWT in memory + httpOnly refresh).
 */
type SessionState = {
  userId: string | null;
  setUserId: (id: string | null) => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  userId: null,
  setUserId: (id) => set({ userId: id }),
}));

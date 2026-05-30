import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/lib/supabase";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  setUser: (user: User | null) => void;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,
      isInitialized: false,

      setUser: (user) => set({ user }),

      signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null });
      },

      initialize: async () => {
        set({ isLoading: true });

        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          const sessionUser = data.session.user;
          set({
            user: {
              id: sessionUser.id,
              email: sessionUser.email ?? "",
              avatar_url: sessionUser.user_metadata?.avatar_url as string | undefined,
              username: sessionUser.user_metadata?.username as string | undefined,
            },
            isLoading: false,
            isInitialized: true,
          });
        } else {
          set({ isLoading: false, isInitialized: true });
        }

        supabase.auth.onAuthStateChange((_event, session) => {
          if (session?.user) {
            set({
              user: {
                id: session.user.id,
                email: session.user.email ?? "",
                avatar_url: session.user.user_metadata?.avatar_url as string | undefined,
                username: session.user.user_metadata?.username as string | undefined,
              },
            });
          } else {
            set({ user: null });
          }
        });
      },
    }),
    {
      name: "auth-storage",
      partialize: () => ({}),
    }
  )
);

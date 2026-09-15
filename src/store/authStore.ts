import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { Profile } from '../types/app.types';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  initialized: boolean;
  /** True while the user arrived via a password reset link and must set a new password. */
  passwordRecovery: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setInitialized: (v: boolean) => void;
  setPasswordRecovery: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  initialized: false,
  passwordRecovery: false,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setProfile: (profile) => set({ profile }),
  setInitialized: (initialized) => set({ initialized }),
  setPasswordRecovery: (passwordRecovery) => set({ passwordRecovery }),
}));

import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { fetchProfile } from '../api/auth';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

export function useAuthListener() {
  const { setSession, setProfile, setInitialized } = useAuthStore();

  useEffect(() => {
    // Hard timeout: if Supabase doesn't respond in 5s, unblock the app
    const failsafe = setTimeout(() => setInitialized(true), 5000);

    (async () => {
      const startTime = Date.now();
      try {
        const sessionResult = await withTimeout(supabase.auth.getSession(), 3000);
        const session = sessionResult?.data?.session ?? null;
        setSession(session);

        // Mark app initialized as soon as we have session state — don't block on profile
        clearTimeout(failsafe);
        setInitialized(true);
        console.log(`[Auth] Session loaded in ${Date.now() - startTime}ms`);

        // Fetch profile in the background (doesn't block UI)
        if (session?.user) {
          try {
            const profile = await withTimeout(fetchProfile(session.user.id), 3000);
            if (profile) setProfile(profile);
          } catch {}
        }
      } catch {
        clearTimeout(failsafe);
        setInitialized(true);
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        try {
          const profile = await fetchProfile(session.user.id);
          setProfile(profile);
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
    });

    return () => {
      clearTimeout(failsafe);
      listener.subscription.unsubscribe();
    };
  }, []);
}

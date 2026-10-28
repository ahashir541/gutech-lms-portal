import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { api } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(null);

  const loadProfile = useCallback(async (s) => {
    setProfileError(null);
    if (!s) {
      setProfile(null);
      return;
    }
    try {
      setProfile(await api.get('/me'));
    } catch (err) {
      setProfile(null);
      setProfileError(err.message);
    }
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadProfile(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        // Defer so the Supabase client finishes storing the session first.
        setTimeout(() => loadProfile(s), 0);
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value = {
    session,
    profile,
    loading,
    profileError,
    refreshProfile: () => loadProfile(session),
    signIn: async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setSession(data.session);
      await loadProfile(data.session);
    },
    signUp: async ({ email, password, ...meta }) => {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: meta } });
      if (error) throw error;
      if (data.session) {
        setSession(data.session);
        await loadProfile(data.session);
      }
      return data;
    },
    signOut: async () => {
      await supabase.auth.signOut();
      setSession(null);
      setProfile(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

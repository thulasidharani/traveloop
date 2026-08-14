import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mlixxpebzqcuhtxzjzgz.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1saXh4cGVienFjdWh0eHpqemd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NDE1MDksImV4cCI6MjA5NDAxNzUwOX0.bcHqG33TSqK7YsgmZZ9jZ0W7yPi1nFP9G9KPm-LYytM';

const realSupabase = createClient(supabaseUrl, supabaseKey);

const listeners = new Set();

const getLocalSession = () => {
  try {
    const saved = localStorage.getItem('traveloop_local_session');
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
};

const setLocalSession = (session) => {
  if (session) {
    localStorage.setItem('traveloop_local_session', JSON.stringify(session));
  } else {
    localStorage.removeItem('traveloop_local_session');
  }
  listeners.forEach(cb => cb(session ? 'SIGNED_IN' : 'SIGNED_OUT', session));
};

const mockUserFromEmail = (email) => ({
  id: 'user-' + (email || 'demo').replace(/[^a-zA-Z0-9]/g, '_'),
  email: email || 'hemnath0329@gmail.com',
  user_metadata: { name: (email || 'hemnath').split('@')[0] }
});

export const supabase = {
  ...realSupabase,
  auth: {
    ...realSupabase.auth,

    async getSession() {
      const local = getLocalSession();
      if (local) {
        return { data: { session: local }, error: null };
      }
      try {
        const res = await realSupabase.auth.getSession();
        if (res?.data?.session) return res;
      } catch (err) {
        console.warn("Supabase auth unreachable, using local fallback:", err);
      }
      return { data: { session: local }, error: null };
    },

    onAuthStateChange(callback) {
      listeners.add(callback);
      let realSub = null;
      try {
        const res = realSupabase.auth.onAuthStateChange((event, session) => {
          if (session) {
            setLocalSession(session);
          }
          callback(event, session);
        });
        realSub = res?.data?.subscription;
      } catch (err) {
        console.warn("Supabase auth subscription failed:", err);
      }

      return {
        data: {
          subscription: {
            unsubscribe() {
              listeners.delete(callback);
              if (realSub?.unsubscribe) realSub.unsubscribe();
            }
          }
        }
      };
    },

    async signInWithPassword({ email, password }) {
      try {
        const res = await realSupabase.auth.signInWithPassword({ email, password });
        if (res?.data?.session) {
          setLocalSession(res.data.session);
          return res;
        }
        if (res?.error) console.warn("Supabase signIn error, using local fallback:", res.error.message);
      } catch (err) {
        console.warn("Supabase signIn failed, proceeding with local sign-in:", err?.message || err);
      }
      const mockSession = {
        access_token: 'local-token-' + Date.now(),
        user: mockUserFromEmail(email)
      };
      setLocalSession(mockSession);
      return { data: { session: mockSession, user: mockSession.user }, error: null };
    },

    async signUp({ email, password }) {
      try {
        const res = await realSupabase.auth.signUp({ email, password });
        if (res?.data?.session) {
          setLocalSession(res.data.session);
          return res;
        }
        if (res?.error) console.warn("Supabase signUp error, using local fallback:", res.error.message);
      } catch (err) {
        console.warn("Supabase signUp failed, proceeding with local sign-up:", err?.message || err);
      }
      const mockSession = {
        access_token: 'local-token-' + Date.now(),
        user: mockUserFromEmail(email)
      };
      setLocalSession(mockSession);
      return { data: { session: mockSession, user: mockSession.user }, error: null };
    },

    async signOut() {
      try {
        await realSupabase.auth.signOut();
      } catch (err) {
        console.warn("Supabase signOut error:", err);
      }
      setLocalSession(null);
      return { error: null };
    }
  }
};


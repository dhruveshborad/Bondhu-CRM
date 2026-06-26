import { create } from 'zustand'
import { supabase, isDemoMode } from '@/lib/supabase'
import type { User } from '@/types'

interface AuthState {
  user: User | null;
  session: any | null;
  loading: boolean;
  isInitialized: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  registerUser: (email: string, password: string, fullName: string, role: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  isInitialized: false,
  error: null,

  setUser: (user) => set({ user }),

  clearError: () => set({ error: null }),

  initialize: async () => {
    set({ loading: true });
    
    if (isDemoMode) {
      // Simulate session load from localStorage
      const savedSession = localStorage.getItem('demo_session');
      if (savedSession) {
        try {
          const sessionData = JSON.parse(savedSession);
          const users = JSON.parse(localStorage.getItem('demo_users') || '[]');
          const userObj = users.find((u: any) => u.email === sessionData.email);
          if (userObj) {
            set({
              user: { id: userObj.id, email: userObj.email, full_name: userObj.full_name, role: userObj.role || 'admin' },
              session: sessionData,
              loading: false,
              isInitialized: true
            });
            return;
          }
        } catch {
          localStorage.removeItem('demo_session');
        }
      }
      set({ user: null, session: null, loading: false, isInitialized: true });
      return;
    }

    try {
      // Fetch initial session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session && session.user) {
        // Fetch user metadata/profile
        const fullName = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User';
        set({
          user: {
            id: session.user.id,
            email: session.user.email || '',
            full_name: fullName,
            role: session.user.user_metadata?.role || 'admin',
          },
          session,
          loading: false,
          isInitialized: true,
        });
      } else {
        set({ user: null, session: null, loading: false, isInitialized: true });
      }

      // Listen for auth state changes
      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session && session.user) {
          const fullName = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User';
          set({
            user: {
              id: session.user.id,
              email: session.user.email || '',
              full_name: fullName,
              role: session.user.user_metadata?.role || 'admin',
            },
            session,
            loading: false,
          });
        } else {
          set({ user: null, session: null, loading: false });
        }
      });

    } catch (error: any) {
      set({ error: error.message, user: null, session: null, loading: false, isInitialized: true });
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null });

    if (isDemoMode) {
      // LocalStorage simulated login
      await new Promise(resolve => setTimeout(resolve, 800)); // Delay for natural feel
      const users = JSON.parse(localStorage.getItem('demo_users') || '[]');
      const matchedUser = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
      
      if (matchedUser) {
        const dummySession = { access_token: 'demo-token', email: matchedUser.email, expires_at: Date.now() + 3600000 };
        localStorage.setItem('demo_session', JSON.stringify(dummySession));
        
        const userPayload = {
          id: matchedUser.id,
          email: matchedUser.email,
          full_name: matchedUser.full_name,
          role: matchedUser.role || 'admin'
        };
        
        set({ user: userPayload, session: dummySession, loading: false });
        return { success: true };
      } else {
        set({ error: 'Invalid email or password', loading: false });
        return { success: false, error: 'Invalid email or password' };
      }
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data?.session && data?.user) {
        const fullName = data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User';
        set({
          user: {
            id: data.user.id,
            email: data.user.email || '',
            full_name: fullName,
            role: data.user.user_metadata?.role || 'admin',
          },
          session: data.session,
          loading: false,
        });
        return { success: true };
      }
      
      set({ loading: false });
      return { success: false, error: 'Failed to retrieve session' };
    } catch (error: any) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },

  registerUser: async (email, password, fullName, role) => {
    set({ loading: true, error: null });

    if (isDemoMode) {
      await new Promise(resolve => setTimeout(resolve, 800));
      const users = JSON.parse(localStorage.getItem('demo_users') || '[]');
      
      if (users.some((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
        set({ error: 'User already exists', loading: false });
        return { success: false, error: 'User already exists' };
      }

      const newUser = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
        email,
        password, // stored plain text for demo mock purposes
        full_name: fullName,
        role,
        created_at: new Date().toISOString()
      };
      
      users.push(newUser);
      localStorage.setItem('demo_users', JSON.stringify(users));

      const profiles = JSON.parse(localStorage.getItem('erp_profiles') || '[]');
      profiles.push({
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
        role: newUser.role,
        created_at: newUser.created_at
      });
      localStorage.setItem('erp_profiles', JSON.stringify(profiles));

      // Automatically log in after registration for smooth UX
      const dummySession = { access_token: 'demo-token', email: newUser.email, expires_at: Date.now() + 3600000 };
      localStorage.setItem('demo_session', JSON.stringify(dummySession));

      const userPayload = {
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
        role: newUser.role
      };

      set({ user: userPayload, session: dummySession, loading: false });
      return { success: true };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
        },
      });

      if (error) throw error;

      if (data?.session && data?.user) {
        set({
          user: {
            id: data.user.id,
            email: data.user.email || '',
            full_name: fullName,
            role: role,
          },
          session: data.session,
          loading: false,
        });
        return { success: true };
      } else {
        // Supabase might have email confirmation enabled
        set({ loading: false });
        return { success: true, error: 'Check your email for confirmation link!' };
      }
    } catch (error: any) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },

  logout: async () => {
    set({ loading: true });

    if (isDemoMode) {
      localStorage.removeItem('demo_session');
      set({ user: null, session: null, loading: false });
      return;
    }

    try {
      await supabase.auth.signOut();
      set({ user: null, session: null, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
}));

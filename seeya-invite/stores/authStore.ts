import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import type { AuthUser, Profile } from '@/types';

interface AuthState {
  user: AuthUser | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    emailRedirectTo?: string
  ) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
}

let authInitialized = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,

  initialize: async () => {
    if (authInitialized) return;
    authInitialized = true;

    const supabase = createClient();

    supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        set({
          user: {
            id: session.user.id,
            email: session.user.email!,
            user_metadata: session.user.user_metadata,
          },
          isAuthenticated: true,
          isLoading: false,
        });
        // Fire-and-forget — never let fetchProfile() bubble an error
        // back through _notifyAllSubscribers → signInWithPassword
        get().fetchProfile().catch(() => {});
      } else if (event === 'INITIAL_SESSION') {
        set({ isLoading: false });
      } else if (event === 'SIGNED_OUT') {
        set({ user: null, profile: null, isAuthenticated: false });
      }
    });
  },

  signIn: async (email: string, password: string) => {
    const supabase = createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    // Update auth state immediately after successful sign-in
    if (data.user) {
      set({
        user: {
          id: data.user.id,
          email: data.user.email!,
          user_metadata: data.user.user_metadata,
        },
        isAuthenticated: true,
        isLoading: false,
      });
      // Fire-and-forget — don't let a profile fetch failure break sign-in
      get().fetchProfile().catch(() => {});
    }

    return {};
  },

  signUp: async (email: string, password: string, fullName: string, emailRedirectTo?: string) => {
    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        ...(emailRedirectTo ? { emailRedirectTo } : {}),
      },
    });

    if (error) {
      return { error: error.message };
    }

    // Create profile
    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: fullName,
      });

      if (profileError) {
        console.error('Profile creation error:', profileError);
      }
    }

    return {};
  },

  signInWithGoogle: async () => {
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/api/auth/callback`,
      },
    });

    if (error) {
      return { error: error.message };
    }

    return {};
  },

  signOut: async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    set({ user: null, profile: null, isAuthenticated: false });
  },

  fetchProfile: async () => {
    const supabase = createClient();
    const { user } = get();

    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profile) {
      set({ profile });
    }
  },
}));

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
    fullName: string
  ) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,

  initialize: async () => {
    const supabase = createClient();

    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (user && !error) {
        set({
          user: {
            id: user.id,
            email: user.email!,
            user_metadata: user.user_metadata,
          },
          isAuthenticated: true,
          isLoading: false,
        });
        await get().fetchProfile();
      } else {
        set({ isLoading: false });
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        // Ignore INITIAL_SESSION - we already handled it above with getUser()
        if (event === 'INITIAL_SESSION') {
          return;
        }

        if (event === 'SIGNED_IN' && session?.user) {
          set({
            user: {
              id: session.user.id,
              email: session.user.email!,
              user_metadata: session.user.user_metadata,
            },
            isAuthenticated: true,
          });
          await get().fetchProfile();
        } else if (event === 'SIGNED_OUT') {
          set({
            user: null,
            profile: null,
            isAuthenticated: false,
          });
        }
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ isLoading: false });
    }
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
      await get().fetchProfile();
    }

    return {};
  },

  signUp: async (email: string, password: string, fullName: string) => {
    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
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

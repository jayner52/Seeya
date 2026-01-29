'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import { Card, Button, Input } from '@/components/ui';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isValidLink, setIsValidLink] = useState<boolean | null>(null);
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const tokensRef = useRef<{ access_token: string; refresh_token: string } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  useEffect(() => {
    // Once valid, never go back to invalid
    if (isValidLink === true) return;

    const supabase = createClient();
    supabaseRef.current = supabase;

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setIsValidLink(true);
      }
    });

    // Check for hash fragments (Supabase sends tokens in URL hash)
    const hash = window.location.hash.substring(1);
    if (hash) {
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');

      if (accessToken && refreshToken && type === 'recovery') {
        // Store tokens for later use
        tokensRef.current = { access_token: accessToken, refresh_token: refreshToken };

        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        }).then(({ error }) => {
          if (!error) {
            setIsValidLink(true);
            window.history.replaceState(null, '', window.location.pathname);
          } else {
            setIsValidLink(false);
          }
        });
        return () => subscription.unsubscribe();
      }
    }

    // No hash tokens - check for existing session after a delay
    const timeoutId = setTimeout(async () => {
      if (isValidLink) return; // Already valid
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsValidLink(true);
      } else {
        setIsValidLink(false);
      }
    }, 2000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [isValidLink]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    setError(null);

    try {
      const supabase = supabaseRef.current || createClient();

      // Ensure we have a session - re-establish if needed
      const { data: { session } } = await supabase.auth.getSession();
      if (!session && tokensRef.current) {
        await supabase.auth.setSession(tokensRef.current);
      }

      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess(true);

      // Redirect to trips after a short delay
      setTimeout(() => {
        window.location.href = '/trips';
      }, 2000);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Password update error:', err);
    }
  };

  if (isValidLink === null) {
    return (
      <Card variant="elevated" padding="lg" className="animate-fade-in">
        <div className="text-center py-8">
          <div className="w-8 h-8 border-2 border-seeya-purple border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-seeya-text-secondary">Verifying reset link...</p>
        </div>
      </Card>
    );
  }

  if (!isValidLink) {
    return (
      <Card variant="elevated" padding="lg" className="animate-fade-in">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">!</div>
          <h1 className="text-2xl font-semibold text-seeya-text mb-2">
            Invalid or expired link
          </h1>
          <p className="text-seeya-text-secondary mb-6">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <Link href="/forgot-password">
            <Button variant="primary" size="lg" className="w-full">
              Request New Link
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  if (success) {
    return (
      <Card variant="elevated" padding="lg" className="animate-fade-in">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="text-green-600" size={32} />
          </div>
          <h1 className="text-2xl font-semibold text-seeya-text mb-2">
            Password updated!
          </h1>
          <p className="text-seeya-text-secondary mb-6">
            Your password has been set. You can now sign in with your email and password.
          </p>
          <p className="text-sm text-seeya-text-secondary">Redirecting you to your trips...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="elevated" padding="lg" className="animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-seeya-text mb-2">
          Set your password
        </h1>
        <p className="text-seeya-text-secondary">
          Create a password to sign in with your email
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="relative">
          <Input
            label="New Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your new password"
            error={errors.password?.message}
            {...register('password')}
          />
          <button
            type="button"
            className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <div className="relative">
          <Input
            label="Confirm Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Confirm your new password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          isLoading={isSubmitting}
        >
          Set Password
        </Button>
      </form>
    </Card>
  );
}

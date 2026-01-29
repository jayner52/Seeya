'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/stores/authStore';
import { createClient } from '@/lib/supabase/client';
import { Card, Button, Input } from '@/components/ui';
import { Mail, Eye, EyeOff } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams?.get('redirect') || '/trips';
  const inviteCode = searchParams?.get('invite');

  const signIn = useAuthStore((state) => state.signIn);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(searchParams?.get('error') || null);
  const [showLoginHelp, setShowLoginHelp] = useState(false);
  const [lastEmail, setLastEmail] = useState<string>('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleSignIn = () => {
    setIsGoogleLoading(true);
    setError(null);
    setShowLoginHelp(false);
    // Use server-side OAuth to properly handle PKCE
    window.location.href = `/api/auth/login?next=${encodeURIComponent(redirect)}`;
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    setShowLoginHelp(false);
    setLastEmail(data.email);

    try {
      const result = await signIn(data.email, data.password);

      if (result.error) {
        // Check if it's an invalid credentials error - likely means Google-only account
        if (result.error.toLowerCase().includes('invalid') ||
            result.error.toLowerCase().includes('credentials')) {
          setShowLoginHelp(true);
        }
        setError(result.error);
        return;
      }

      // Use full page reload to ensure cookies are properly sent to server
      if (inviteCode) {
        window.location.href = `/invite/${inviteCode}/accept`;
      } else {
        window.location.href = redirect;
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Sign in error:', err);
    }
  };

  return (
    <Card variant="elevated" padding="lg" className="animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-seeya-text mb-2">
          Welcome back
        </h1>
        <p className="text-seeya-text-secondary">
          Sign in to continue planning your trips
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm">
          <p>{error}</p>
          {showLoginHelp && (
            <div className="mt-3 pt-3 border-t border-red-200 space-y-2">
              <p className="text-red-600 font-medium">Did you sign up with Google?</p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="text-left text-seeya-purple hover:underline"
                >
                  → Sign in with Google instead
                </button>
                <Link
                  href={`/forgot-password${lastEmail ? `?email=${encodeURIComponent(lastEmail)}` : ''}`}
                  className="text-seeya-purple hover:underline"
                >
                  → Set a password for email login
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="relative">
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Mail
            className="absolute right-3 top-[38px] text-gray-400"
            size={18}
          />
        </div>

        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
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

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm text-seeya-purple hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          isLoading={isSubmitting}
        >
          Sign In
        </Button>
      </form>

      {/* Divider */}
      <div className="my-6 flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-sm text-seeya-text-secondary">or</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Google Sign In */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isGoogleLoading}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-xl text-seeya-text font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        {isGoogleLoading ? (
          <div className="w-5 h-5 border-2 border-gray-300 border-t-seeya-purple rounded-full animate-spin" />
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        )}
        Continue with Google
      </button>

      <div className="mt-8 text-center">
        <p className="text-seeya-text-secondary text-sm">
          Don&apos;t have an account?{' '}
          <Link
            href={`/signup${inviteCode ? `?invite=${inviteCode}` : redirect !== '/trips' ? `?redirect=${redirect}` : ''}`}
            className="text-seeya-purple font-medium hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </Card>
  );
}

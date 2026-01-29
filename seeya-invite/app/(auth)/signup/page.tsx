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
import { Mail, Eye, EyeOff, User } from 'lucide-react';

const signupSchema = z
  .object({
    fullName: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams?.get('redirect') || '/trips';
  const inviteCode = searchParams?.get('invite');

  const signUp = useAuthStore((state) => state.signUp);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(searchParams?.get('error') || null);
  const [success, setSuccess] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleSignIn = () => {
    setIsGoogleLoading(true);
    setError(null);
    // Use server-side OAuth to properly handle PKCE
    window.location.href = `/api/auth/login?next=${encodeURIComponent(redirect)}`;
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormData) => {
    setError(null);
    const result = await signUp(data.email, data.password, data.fullName);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSuccess(true);
  };

  if (success) {
    return (
      <Card variant="elevated" padding="lg" className="animate-fade-in">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="text-green-600" size={32} />
          </div>
          <h1 className="text-2xl font-semibold text-seeya-text mb-2">
            Check your email
          </h1>
          <p className="text-seeya-text-secondary mb-6">
            We&apos;ve sent you a confirmation link. Please check your email to
            verify your account.
          </p>
          <Link href="/login">
            <Button variant="primary" size="lg" className="w-full">
              Back to Sign In
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="elevated" padding="lg" className="animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-seeya-text mb-2">
          Create your account
        </h1>
        <p className="text-seeya-text-secondary">
          Start planning your next adventure
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
            label="Full Name"
            type="text"
            placeholder="John Doe"
            error={errors.fullName?.message}
            {...register('fullName')}
          />
          <User
            className="absolute right-3 top-[38px] text-gray-400"
            size={18}
          />
        </div>

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
            placeholder="Create a password"
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
            placeholder="Confirm your password"
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
          Create Account
        </Button>
      </form>

      {/* Divider */}
      <div className="my-6 flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-sm text-seeya-text-secondary">or</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Google Sign Up */}
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

      <p className="mt-6 text-xs text-center text-seeya-text-secondary">
        By signing up, you agree to our{' '}
        <Link href="/terms" className="text-seeya-purple hover:underline">
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="text-seeya-purple hover:underline">
          Privacy Policy
        </Link>
      </p>

      <div className="mt-6 text-center">
        <p className="text-seeya-text-secondary text-sm">
          Already have an account?{' '}
          <Link
            href={`/login${inviteCode ? `?invite=${inviteCode}` : redirect !== '/trips' ? `?redirect=${redirect}` : ''}`}
            className="text-seeya-purple font-medium hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </Card>
  );
}

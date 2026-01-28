'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/stores/authStore';
import { Card, Button, Input } from '@/components/ui';
import { Mail, Lock, Eye, EyeOff, User } from 'lucide-react';

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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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

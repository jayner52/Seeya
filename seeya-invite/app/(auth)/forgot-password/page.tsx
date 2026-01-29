'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import { Card, Button, Input } from '@/components/ui';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const searchParams = useSearchParams();
  const defaultEmail = searchParams?.get('email') || '';

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: defaultEmail,
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Password reset error:', err);
    }
  };

  if (success) {
    return (
      <Card variant="elevated" padding="lg" className="animate-fade-in">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="text-green-600" size={32} />
          </div>
          <h1 className="text-2xl font-semibold text-seeya-text mb-2">
            Check your email
          </h1>
          <p className="text-seeya-text-secondary mb-6">
            We&apos;ve sent you a password reset link. Click the link in your email to set a new password.
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
      <Link
        href="/login"
        className="inline-flex items-center gap-1 text-sm text-seeya-text-secondary hover:text-seeya-text mb-6"
      >
        <ArrowLeft size={16} />
        Back to login
      </Link>

      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-seeya-text mb-2">
          Reset your password
        </h1>
        <p className="text-seeya-text-secondary">
          Enter your email and we&apos;ll send you a link to reset your password
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

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          isLoading={isSubmitting}
        >
          Send Reset Link
        </Button>
      </form>

      <p className="mt-6 text-center text-seeya-text-secondary text-sm">
        Remember your password?{' '}
        <Link href="/login" className="text-seeya-purple font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </Card>
  );
}

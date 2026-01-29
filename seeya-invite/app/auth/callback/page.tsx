'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Signing you in...');
  const [error, setError] = useState<string | null>(null);
  const processed = useRef(false);

  useEffect(() => {
    // Prevent double processing in React strict mode
    if (processed.current) return;
    processed.current = true;

    const handleCallback = async () => {
      // Get the authorization code from URL query params (PKCE flow)
      const code = searchParams?.get('code');
      const next = searchParams?.get('next') || '/trips';
      const errorParam = searchParams?.get('error');
      const errorDescription = searchParams?.get('error_description');

      // Handle OAuth errors from provider
      if (errorParam) {
        setError(errorDescription || errorParam);
        return;
      }

      if (!code) {
        setError('No authorization code received');
        return;
      }

      setStatus('Completing sign in...');

      try {
        const supabase = createClient();
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          setError(exchangeError.message);
          return;
        }

        setStatus('Success! Redirecting...');
        window.location.href = next;
      } catch (err) {
        console.error('Callback error:', err);
        setError('Failed to complete sign in');
      }
    };

    handleCallback();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-seeya-purple to-purple-700">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center">
          <div className="text-red-500 text-6xl mb-4">!</div>
          <h1 className="text-xl font-semibold mb-2">Sign in failed</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <a
            href="/login"
            className="inline-block px-6 py-3 bg-seeya-purple text-white rounded-xl font-medium"
          >
            Back to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-seeya-purple to-purple-700">
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-4"></div>
        <p className="text-lg">{status}</p>
      </div>
    </div>
  );
}

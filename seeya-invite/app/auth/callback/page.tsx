'use client';

import { useEffect, useState, useRef } from 'react';

export default function AuthCallbackPage() {
  const [status, setStatus] = useState('Signing you in...');
  const [error, setError] = useState<string | null>(null);
  const processed = useRef(false);

  useEffect(() => {
    // Prevent double processing in React strict mode
    if (processed.current) return;
    processed.current = true;

    const handleCallback = () => {
      // Get the next URL from query params
      const params = new URLSearchParams(window.location.search);
      const next = params.get('next') || '/trips';

      // Check for error in URL hash
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const hashError = hashParams.get('error');
      const errorDescription = hashParams.get('error_description');

      if (hashError) {
        setError(errorDescription || hashError);
        return;
      }

      // Check if we have tokens in the hash (implicit flow)
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (!accessToken) {
        setError('No access token received');
        return;
      }

      setStatus('Processing authentication...');

      // Redirect to server route that will set cookies and redirect to destination
      const setSessionUrl = new URL('/api/auth/set-session', window.location.origin);
      setSessionUrl.searchParams.set('access_token', accessToken);
      if (refreshToken) {
        setSessionUrl.searchParams.set('refresh_token', refreshToken);
      }
      setSessionUrl.searchParams.set('next', next);

      // Redirect to server route
      window.location.replace(setSessionUrl.toString());
    };

    handleCallback();
  }, []);

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

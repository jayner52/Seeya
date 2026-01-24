import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      // Get the session from the URL hash
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Auth callback error:', error);
        navigate('/auth', { replace: true });
        return;
      }

      if (session) {
        // Get the stored redirect path or default to /trips
        const redirectPath = sessionStorage.getItem('auth_redirect') || '/trips';
        sessionStorage.removeItem('auth_redirect');
        navigate(redirectPath, { replace: true });
      } else {
        navigate('/auth', { replace: true });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-pulse text-muted-foreground">Completing sign in...</div>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate, useLocation, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Map, AlertCircle } from 'lucide-react';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9._]+$/, 'Username can only contain letters, numbers, dots, and underscores'),
  fullName: z.string().max(100, 'Name must be less than 100 characters').optional(),
});

// Google icon component
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="currentColor"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="currentColor"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="currentColor"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

export default function Auth() {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState<'google' | null>(null);
  
  const { signIn, signUp, signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Get redirect path from location state OR URL query param
  const stateFrom = location.state?.from?.pathname;
  const queryRedirect = searchParams.get('redirect');
  const from = stateFrom || queryRedirect || '/trips';

  // Redirect if already logged in
  if (user) {
    navigate(from, { replace: true });
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }
    
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please try again.');
      } else {
        setError(error.message);
      }
    } else {
      toast({ title: 'Welcome back!', description: 'You have successfully signed in.' });
      navigate(from, { replace: true });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const validation = signupSchema.safeParse({ email, password, username, fullName: fullName || undefined });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }
    
    setIsLoading(true);
    const { error } = await signUp(email, password, username, fullName || undefined);
    setIsLoading(false);
    
    if (error) {
      if (error.message.includes('already registered')) {
        setError('An account with this email already exists. Please sign in instead.');
      } else if (error.message.includes('duplicate key')) {
        setError('This username is already taken. Please choose another.');
      } else {
        setError(error.message);
      }
    } else {
      toast({ title: 'Welcome to roamwyth!', description: 'Your account has been created.' });
      navigate(from, { replace: true });
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsOAuthLoading('google');
    // Pass the intended redirect path to OAuth
    const { error } = await signInWithGoogle(from);
    if (error) {
      setError(error.message);
      setIsOAuthLoading(null);
    }
    // Don't set loading to false on success - redirect will happen
  };


  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8 animate-fade-in">
        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
          <Map className="w-6 h-6 text-foreground" />
        </div>
        <span className="font-display text-2xl font-semibold text-foreground">
          roamwyth
        </span>
      </div>

      <Card className="w-full max-w-md bg-card border-border/50 shadow-card animate-slide-up">
        <CardHeader className="text-center">
          <CardTitle className="font-display text-2xl">
            {activeTab === 'login' ? 'Welcome back' : 'Join roamwyth'}
          </CardTitle>
          <CardDescription>
            {activeTab === 'login'
              ? 'Sign in to your account to continue'
              : 'Create an account to start planning trips with friends'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Social Auth Buttons */}
          <div className="space-y-3 mb-6">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={isOAuthLoading !== null || isLoading}
            >
              {isOAuthLoading === 'google' ? (
                <span className="animate-pulse">Connecting...</span>
              ) : (
                <>
                  <GoogleIcon />
                  <span className="ml-2">Continue with Google</span>
                </>
              )}
            </Button>
          </div>

          <div className="relative mb-6">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
              or continue with email
            </span>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as 'login' | 'signup'); setError(null); }}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-background"
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-background"
                    autoComplete="current-password"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading || isOAuthLoading !== null}>
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-fullname">Full Name (optional)</Label>
                  <Input
                    id="signup-fullname"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="bg-background"
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-username">Username</Label>
                  <Input
                    id="signup-username"
                    type="text"
                    placeholder="john.doe"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-background"
                    autoComplete="username"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Friends can find you by your exact username
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-background"
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-background"
                    autoComplete="new-password"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    At least 6 characters
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading || isOAuthLoading !== null}>
                  {isLoading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {/* Terms and Privacy Links */}
          <p className="mt-6 text-xs text-muted-foreground text-center">
            By continuing, you agree to our{' '}
            <Link to="/terms" className="text-foreground underline hover:text-foreground/80">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="text-foreground underline hover:text-foreground/80">
              Privacy Policy
            </Link>
          </p>
        </CardContent>
      </Card>

      <p className="mt-6 text-sm text-muted-foreground text-center animate-fade-in">
        A private travel network for real friends
      </p>
    </div>
  );
}

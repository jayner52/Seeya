import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Shield, Bell, LogOut, HelpCircle, RotateCcw, Compass, Crown, Sparkles, Check, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useAppTour } from '@/components/providers/AppTourProvider';
import { useSubscription } from '@/hooks/useSubscription';
import { QuickOnboardingWizard } from '@/components/trips/QuickOnboardingWizard';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface NotificationPreferences {
  notify_tripbit_participant: boolean;
  notify_trip_messages: boolean;
  notify_trip_invites: boolean;
  notify_friend_requests: boolean;
}

export default function Settings() {
  const { signOut, user } = useAuth();
  const { showOnboarding, setShowOnboarding, completeOnboarding } = useOnboarding();
  const { setShowAppTour } = useAppTour();
  const { isPremium, planType, currentPeriodEnd, isLoading: subLoading } = useSubscription();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    notify_tripbit_participant: true,
    notify_trip_messages: true,
    notify_trip_invites: true,
    notify_friend_requests: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Welcome to Premium! Your subscription is now active.');
    }
  }, [searchParams]);

  useEffect(() => {
    if (user?.id) {
      fetchPreferences();
    }
  }, [user?.id]);

  const fetchPreferences = async () => {
    if (!user?.id) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('notify_tripbit_participant, notify_trip_messages, notify_trip_invites, notify_friend_requests')
      .eq('id', user.id)
      .single();

    if (!error && data) {
      setPreferences({
        notify_tripbit_participant: data.notify_tripbit_participant ?? true,
        notify_trip_messages: data.notify_trip_messages ?? true,
        notify_trip_invites: data.notify_trip_invites ?? true,
        notify_friend_requests: data.notify_friend_requests ?? true,
      });
    }
    setLoading(false);
  };

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!user?.id) return;

    setPreferences(prev => ({ ...prev, [key]: value }));

    const { error } = await supabase
      .from('profiles')
      .update({ [key]: value })
      .eq('id', user.id);

    if (error) {
      toast.error('Failed to update preference');
      setPreferences(prev => ({ ...prev, [key]: !value }));
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <PageLayout
      title="Settings"
      subtitle="Manage your privacy and notification preferences"
    >
      <div className="max-w-2xl space-y-6">
        {/* Subscription */}
        <Card className={cn(
          "border-border/50 animate-fade-in",
          isPremium ? "bg-gradient-to-br from-amber-500/5 to-orange-500/5 border-amber-500/30" : "bg-card"
        )}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className={cn(
                "rounded-full p-1.5",
                isPremium ? "bg-gradient-to-br from-amber-500 to-orange-500" : "bg-muted"
              )}>
                {isPremium ? (
                  <Crown className="w-4 h-4 text-white" />
                ) : (
                  <Sparkles className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <CardTitle className="font-display text-xl">Subscription</CardTitle>
              {isPremium && (
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                  Premium
                </Badge>
              )}
            </div>
            <CardDescription>
              {isPremium 
                ? "You have access to all premium features"
                : "Upgrade to unlock unlimited trips and more"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isPremium ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Plan</span>
                    <p className="font-medium">Premium</p>
                  </div>
                  {currentPeriodEnd && (
                    <div>
                      <span className="text-muted-foreground">Renews</span>
                      <p className="font-medium">{format(new Date(currentPeriodEnd), 'MMM d, yyyy')}</p>
                    </div>
                  )}
                </div>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Your premium features:</p>
                  <ul className="text-sm text-muted-foreground space-y-1.5">
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Unlimited upcoming trips</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> AI-powered travel suggestions</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Calendar view & exports</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> PDF & ICS exports</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Ad-free experience</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Comparison Table */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Free Column */}
                  <div className="p-3 rounded-lg border border-border bg-muted/30">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="secondary" className="text-xs">Current</Badge>
                      <span className="font-semibold text-sm">Free</span>
                    </div>
                    <ul className="space-y-2 text-xs">
                      <li className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                        <span>Up to 5 upcoming trips</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                        <span>Basic trip planning</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                        <span>Friend recommendations</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                        <span>Travel pal network</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-muted-foreground">
                        <X className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>AI suggestions</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-muted-foreground">
                        <X className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>Calendar exports</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-muted-foreground">
                        <X className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>Ad-free</span>
                      </li>
                    </ul>
                  </div>
                  
                  {/* Premium Column */}
                  <div className="p-3 rounded-lg border-2 border-amber-500/50 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
                    <div className="flex items-center gap-2 mb-3">
                      <Crown className="w-4 h-4 text-amber-500" />
                      <span className="font-semibold text-sm">Premium</span>
                    </div>
                    <ul className="space-y-2 text-xs">
                      <li className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                        <span className="font-medium">Unlimited trips</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                        <span>Advanced trip planning</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                        <span>Friend recommendations</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                        <span>Travel pal network</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                        <span className="font-medium">AI suggestions</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                        <span className="font-medium">PDF & ICS exports</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                        <span className="font-medium">Ad-free</span>
                      </li>
                    </ul>
                  </div>
                </div>
                
                <Button 
                  onClick={() => navigate('/pricing')}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to Premium - $4.99/mo
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        <Card className="bg-card border-border/50 animate-fade-in">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="bg-primary rounded-full p-1.5">
                <Shield className="w-4 h-4 text-primary-foreground" />
              </div>
              <CardTitle className="font-display text-xl">Privacy & Safety</CardTitle>
            </div>
            <CardDescription>
              Control how your travel information is shared
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Default Trip Visibility</Label>
                <p className="text-sm text-muted-foreground">
                  Applied to all new trips you create
                </p>
              </div>
              <Select defaultValue="busy_only">
                <SelectTrigger className="w-40 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="only_me">Only Me</SelectItem>
                  <SelectItem value="busy_only">Busy Only</SelectItem>
                  <SelectItem value="dates_only">Dates Only</SelectItem>
                  <SelectItem value="location_only">Location Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Delayed Trip Visibility</Label>
                <p className="text-sm text-muted-foreground">
                  Trips only appear to friends after they start
                </p>
              </div>
              <Switch />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Calendar Sharing</Label>
                <p className="text-sm text-muted-foreground">
                  Allow friends to see your availability
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="bg-card border-border/50 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="bg-primary rounded-full p-1.5">
                <Bell className="w-4 h-4 text-primary-foreground" />
              </div>
              <CardTitle className="font-display text-xl">Notifications</CardTitle>
            </div>
            <CardDescription>
              Manage how you receive updates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Travel Pal Requests</Label>
                <p className="text-sm text-muted-foreground">
                  When someone sends you a travel pal request
                </p>
              </div>
              <Switch 
                checked={preferences.notify_friend_requests}
                onCheckedChange={(checked) => updatePreference('notify_friend_requests', checked)}
                disabled={loading}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Trip Invitations</Label>
                <p className="text-sm text-muted-foreground">
                  When you're invited to a trip
                </p>
              </div>
              <Switch 
                checked={preferences.notify_trip_invites}
                onCheckedChange={(checked) => updatePreference('notify_trip_invites', checked)}
                disabled={loading}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Trip Messages</Label>
                <p className="text-sm text-muted-foreground">
                  When someone sends a message in your trips
                </p>
              </div>
              <Switch 
                checked={preferences.notify_trip_messages}
                onCheckedChange={(checked) => updatePreference('notify_trip_messages', checked)}
                disabled={loading}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Added to Tripbit</Label>
                <p className="text-sm text-muted-foreground">
                  When someone adds you to a tripbit
                </p>
              </div>
              <Switch 
                checked={preferences.notify_tripbit_participant}
                onCheckedChange={(checked) => updatePreference('notify_tripbit_participant', checked)}
                disabled={loading}
              />
            </div>
          </CardContent>
        </Card>

        {/* Help & Support */}
        <Card className="bg-card border-border/50 animate-slide-up" style={{ animationDelay: '150ms' }}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="bg-amber-500 rounded-full p-1.5">
                <HelpCircle className="w-4 h-4 text-white" />
              </div>
              <CardTitle className="font-display text-xl">Help & Support</CardTitle>
            </div>
            <CardDescription>
              Learn how to get the most out of roamwyth
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="gap-2 w-full justify-start"
              onClick={() => setShowAppTour(true)}
            >
              <Compass className="w-4 h-4" />
              Replay App Tour
            </Button>
            <Button 
              variant="outline" 
              className="gap-2 w-full justify-start text-muted-foreground"
              onClick={() => setShowOnboarding(true)}
            >
              <RotateCcw className="w-4 h-4" />
              Redo Initial Setup
            </Button>
          </CardContent>
        </Card>

        {/* Account / Sign Out */}
        <Card className="bg-card border-destructive/30 animate-slide-up" style={{ animationDelay: '200ms' }}>
          <CardHeader>
            <CardTitle className="font-display text-xl text-destructive">Account</CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Onboarding Wizard */}
      <QuickOnboardingWizard 
        open={showOnboarding} 
        onComplete={completeOnboarding}
        onStartTour={() => setShowAppTour(true)}
        onSkip={completeOnboarding}
      />
    </PageLayout>
  );
}

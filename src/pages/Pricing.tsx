import { useState } from 'react';
import { Check, Crown, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageLayout } from '@/components/layout/PageLayout';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';

// Stripe price IDs
const STRIPE_PRICES = {
  monthly: 'price_1SfC4WJLciou5kJv0Fk4ZTUg',
  annual: 'price_1SfC4rJLciou5kJvrgUfwgLY',
};

const freeFeatures = [
  'Up to 5 upcoming trips',
  'Unlimited past trips',
  'Trip collaboration with friends',
  'Wanderlist (bucket list)',
  'Friend recommendations',
  'Trip chat',
  'Basic trip planning',
];

const premiumFeatures = [
  'Everything in Free, plus:',
  'Unlimited upcoming trips',
  'AI-powered travel suggestions',
  'Calendar view',
  'PDF & calendar exports',
  'Ad-free experience',
  'Priority support',
];

export default function Pricing() {
  const { user } = useAuth();
  const { isPremium, isLoading: subLoading } = useSubscription();
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('canceled') === 'true') {
      toast.info('Checkout was canceled');
    }
  }, [searchParams]);

  const handleUpgrade = async () => {
    if (!user) {
      toast.error('Please sign in to upgrade');
      navigate('/auth');
      return;
    }

    setIsCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          priceId: billingCycle === 'monthly' ? STRIPE_PRICES.monthly : STRIPE_PRICES.annual 
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Validate the URL is a legitimate Stripe checkout URL (defense in depth)
        try {
          const checkoutUrl = new URL(data.url);
          if (checkoutUrl.hostname === 'checkout.stripe.com' || 
              checkoutUrl.hostname.endsWith('.stripe.com')) {
            window.location.href = data.url;
          } else {
            throw new Error('Invalid checkout URL origin');
          }
        } catch (urlError) {
          console.error('Invalid checkout URL:', urlError);
          throw new Error('Invalid checkout URL');
        }
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  const monthlyPrice = 4.99;
  const annualPrice = 49.99;
  const annualMonthly = (annualPrice / 12).toFixed(2);
  const savings = Math.round((1 - (annualPrice / (monthlyPrice * 12))) * 100);

  return (
    <PageLayout title="Choose Your Plan" subtitle="Unlock the full potential of your travel planning">
      <div className="max-w-4xl mx-auto">
        {/* Billing Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center bg-muted rounded-full p-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                billingCycle === 'monthly' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                billingCycle === 'annual' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Annual
              <Badge variant="secondary" className="bg-green-500/10 text-green-600 text-xs">
                Save {savings}%
              </Badge>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Free Plan */}
          <Card className="relative">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-muted-foreground" />
                </div>
                Free
              </CardTitle>
              <CardDescription>Perfect for casual travelers</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {freeFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button 
                variant="outline" 
                className="w-full mt-6"
                disabled={!isPremium}
              >
                {isPremium ? 'Downgrade' : 'Current Plan'}
              </Button>
            </CardContent>
          </Card>

          {/* Premium Plan */}
          <Card className="relative border-amber-500/50 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                Most Popular
              </Badge>
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <Crown className="h-5 w-5 text-white" />
                </div>
                Premium
              </CardTitle>
              <CardDescription>For serious trip planners</CardDescription>
              <div className="mt-4">
                {billingCycle === 'monthly' ? (
                  <>
                    <span className="text-4xl font-bold">${monthlyPrice}</span>
                    <span className="text-muted-foreground">/month</span>
                  </>
                ) : (
                  <>
                    <span className="text-4xl font-bold">${annualMonthly}</span>
                    <span className="text-muted-foreground">/month</span>
                    <p className="text-sm text-muted-foreground mt-1">
                      ${annualPrice} billed annually
                    </p>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {premiumFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button 
                className="w-full mt-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                onClick={handleUpgrade}
                disabled={isPremium || isCheckoutLoading || subLoading}
              >
                {isCheckoutLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : isPremium ? (
                  'Current Plan'
                ) : (
                  <>
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade to Premium
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* FAQ or additional info */}
        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>Cancel anytime. No questions asked.</p>
          <p className="mt-1">Prices shown in USD. Local currency conversion at checkout.</p>
        </div>
      </div>
    </PageLayout>
  );
}

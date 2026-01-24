import { Crown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

interface UpgradePromptProps {
  feature: string;
  compact?: boolean;
  className?: string;
}

export function UpgradePrompt({ feature, compact = false, className = '' }: UpgradePromptProps) {
  const navigate = useNavigate();

  if (compact) {
    return (
      <div className={`flex items-center gap-2 p-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-lg border border-amber-500/20 ${className}`}>
        <Crown className="h-4 w-4 text-amber-500 flex-shrink-0" />
        <span className="text-sm text-muted-foreground flex-1">
          {feature} is a Premium feature
        </span>
        <Button 
          size="sm" 
          variant="outline"
          className="border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
          onClick={() => navigate('/pricing')}
        >
          Upgrade
        </Button>
      </div>
    );
  }

  return (
    <Card className={`border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5 ${className}`}>
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-3">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <CardTitle className="text-lg">Unlock {feature}</CardTitle>
        <CardDescription>
          This feature is available with Wanderpal Premium
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Button 
          onClick={() => navigate('/pricing')}
          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
        >
          <Crown className="h-4 w-4 mr-2" />
          Upgrade to Premium
        </Button>
        <p className="text-xs text-muted-foreground mt-3">
          Starting at $4.99/month
        </p>
      </CardContent>
    </Card>
  );
}

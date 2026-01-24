import { useState, useEffect } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Sparkles, MapPin, Star, Utensils, Compass, Home, Lightbulb, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AvatarEditorDialog } from '@/components/profile/AvatarEditorDialog';
import { useUserRecommendations, GroupedRecommendations } from '@/hooks/useUserRecommendations';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const categoryConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  restaurant: { icon: Utensils, label: 'Restaurant', color: 'text-orange-500' },
  activity: { icon: Compass, label: 'Activity', color: 'text-blue-500' },
  stay: { icon: Home, label: 'Stay', color: 'text-purple-500' },
  tip: { icon: Lightbulb, label: 'Tip', color: 'text-yellow-500' },
};

export default function Profile() {
  const { profile, refreshProfile, user } = useAuth();
  const { toast } = useToast();
  const { recommendations, grouped, loading: recsLoading } = useUserRecommendations(user?.id);
  
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set());
  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setUsername(profile.username || '');
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile]);

  const toggleCountry = (countryId: string) => {
    setExpandedCountries(prev => {
      const next = new Set(prev);
      if (next.has(countryId)) {
        next.delete(countryId);
      } else {
        next.add(countryId);
      }
      return next;
    });
  };

  const toggleCity = (cityId: string) => {
    setExpandedCities(prev => {
      const next = new Set(prev);
      if (next.has(cityId)) {
        next.delete(cityId);
      } else {
        next.add(cityId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName || null,
        username,
        bio: bio || null,
      })
      .eq('id', user.id);
    
    setIsSaving(false);
    
    if (error) {
      toast({
        title: 'Error',
        description: error.message.includes('duplicate') 
          ? 'This username is already taken' 
          : 'Failed to save changes',
        variant: 'destructive',
      });
    } else {
      await refreshProfile();
      toast({ title: 'Saved', description: 'Your profile has been updated.' });
    }
  };

  const getInitials = () => {
    if (fullName) {
      return fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (username) {
      return username.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  return (
    <PageLayout
      title="Profile"
      subtitle="Manage your personal information"
    >
      <div className="max-w-2xl space-y-6">
        {/* Profile Info */}
        <Card className="bg-card border-border/50 animate-fade-in">
          <CardHeader>
            <CardTitle className="font-display text-xl">Personal Information</CardTitle>
            <CardDescription>
              This information is private and only used for your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20 border-2 border-secondary">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="text-2xl font-display">{getInitials()}</AvatarFallback>
              </Avatar>
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => setAvatarDialogOpen(true)}
              >
                <Camera className="w-4 h-4" />
                Change Photo
              </Button>
            </div>

            {user && (
              <AvatarEditorDialog
                open={avatarDialogOpen}
                onOpenChange={setAvatarDialogOpen}
                userId={user.id}
                currentAvatarUrl={avatarUrl}
                onAvatarUpdate={(url) => {
                  setAvatarUrl(url);
                  refreshProfile();
                }}
              />
            )}

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="bg-background" 
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="username">Username</Label>
                <Input 
                  id="username" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-background" 
                />
                <p className="text-xs text-muted-foreground">
                  Travel Pals can find you by your exact username
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="bio">Bio</Label>
                <Input 
                  id="bio" 
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="A short bio about yourself"
                  className="bg-background" 
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={user?.email || ''} 
                  disabled
                  className="bg-background opacity-60" 
                />
              </div>
            </div>

            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        {/* My Recommendations */}
        <Card className="bg-card border-border/50 animate-slide-up" style={{ animationDelay: '50ms' }}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="bg-primary rounded-full p-1.5">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <CardTitle className="font-display text-xl">My Recommendations</CardTitle>
              {recommendations.length > 0 && (
                <span className="text-sm text-muted-foreground ml-auto">
                  {recommendations.length} total
                </span>
              )}
            </div>
            <CardDescription>
              Places and tips you've shared from your trips
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recsLoading ? (
              <div className="text-center py-4 text-muted-foreground">Loading recommendations...</div>
            ) : recommendations.length === 0 ? (
              <div className="text-center py-6">
                <Sparkles className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground text-sm">No recommendations yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add recommendations to your trips to share your favorite places
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.values(grouped).map((countryData) => (
                  <Collapsible
                    key={countryData.country.id}
                    open={expandedCountries.has(countryData.country.id)}
                    onOpenChange={() => toggleCountry(countryData.country.id)}
                  >
                    <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      {expandedCountries.has(countryData.country.id) ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="text-lg">{countryData.country.emoji}</span>
                      <span className="font-medium">{countryData.country.name}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {countryData.countryWide.length + Object.values(countryData.cities).reduce((acc, c) => acc + c.recommendations.length, 0)} recs
                      </span>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-8 space-y-2 mt-2">
                      {/* Country-wide recommendations */}
                      {countryData.countryWide.map((rec) => {
                        const config = categoryConfig[rec.category] || categoryConfig.tip;
                        const Icon = config.icon;
                        return (
                          <div key={rec.id} className="flex items-start gap-3 p-2 rounded-lg bg-muted/30">
                            <div className={`p-1.5 rounded-full bg-muted ${config.color}`}>
                              <Icon className="w-3 h-3" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm truncate">{rec.title}</span>
                                {rec.rating && (
                                  <div className="flex items-center gap-0.5">
                                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                    <span className="text-xs">{rec.rating}</span>
                                  </div>
                                )}
                              </div>
                              {rec.tips && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{rec.tips}</p>
                              )}
                            </div>
                            {rec.url && (
                              <a href={rec.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                              </a>
                            )}
                          </div>
                        );
                      })}
                      
                      {/* Cities */}
                      {Object.values(countryData.cities).map((cityData) => (
                        <Collapsible
                          key={cityData.city.id}
                          open={expandedCities.has(cityData.city.id)}
                          onOpenChange={() => toggleCity(cityData.city.id)}
                        >
                          <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-muted/50 transition-colors">
                            {expandedCities.has(cityData.city.id) ? (
                              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-sm font-medium">{cityData.city.name}</span>
                            <span className="text-xs text-muted-foreground ml-auto">
                              {cityData.recommendations.length}
                            </span>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pl-6 space-y-2 mt-1">
                            {cityData.recommendations.map((rec) => {
                              const config = categoryConfig[rec.category] || categoryConfig.tip;
                              const Icon = config.icon;
                              return (
                                <div key={rec.id} className="flex items-start gap-3 p-2 rounded-lg bg-muted/30">
                                  <div className={`p-1.5 rounded-full bg-muted ${config.color}`}>
                                    <Icon className="w-3 h-3" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-sm truncate">{rec.title}</span>
                                      {rec.rating && (
                                        <div className="flex items-center gap-0.5">
                                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                          <span className="text-xs">{rec.rating}</span>
                                        </div>
                                      )}
                                    </div>
                                    {rec.tips && (
                                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{rec.tips}</p>
                                    )}
                                  </div>
                                  {rec.url && (
                                    <a href={rec.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                                    </a>
                                  )}
                                </div>
                              );
                            })}
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

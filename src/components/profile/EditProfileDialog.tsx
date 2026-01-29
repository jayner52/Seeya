import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, User, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AvatarEditorDialog } from './AvatarEditorDialog';

type VisibilityOption = 'public' | 'friends_only' | 'private';

interface ProfileData {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  bio_visibility?: string;
  trips_visibility?: string;
  recommendations_visibility?: string;
  wanderlist_visibility?: string;
  travel_pals_visibility?: string;
  stats_visibility?: string;
}

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: ProfileData;
  onProfileUpdate: () => void;
}

const visibilityOptions = [
  { value: 'public', label: 'Public', description: 'Anyone can see' },
  { value: 'friends_only', label: 'Travel Pals Only', description: 'Only Travel Pals' },
  { value: 'private', label: 'Private', description: 'Only you' },
];

const visibilitySections = [
  { key: 'bio_visibility', label: 'Bio' },
  { key: 'stats_visibility', label: 'Travel Stats' },
  { key: 'trips_visibility', label: 'Trips' },
  { key: 'recommendations_visibility', label: 'Recommendations' },
  { key: 'wanderlist_visibility', label: 'Wanderlist' },
  { key: 'travel_pals_visibility', label: 'Travel Pals' },
];

export function EditProfileDialog({ open, onOpenChange, profile, onProfileUpdate }: EditProfileDialogProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  
  // Profile fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  // Visibility settings
  const [visibilitySettings, setVisibilitySettings] = useState<Record<string, VisibilityOption>>({
    bio_visibility: 'friends_only',
    trips_visibility: 'friends_only',
    recommendations_visibility: 'friends_only',
    wanderlist_visibility: 'friends_only',
    travel_pals_visibility: 'friends_only',
    stats_visibility: 'friends_only',
  });

  useEffect(() => {
    if (profile && open) {
      setFullName(profile.full_name || '');
      setUsername(profile.username || '');
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatar_url);
      setVisibilitySettings({
        bio_visibility: (profile.bio_visibility as VisibilityOption) || 'friends_only',
        trips_visibility: (profile.trips_visibility as VisibilityOption) || 'friends_only',
        recommendations_visibility: (profile.recommendations_visibility as VisibilityOption) || 'friends_only',
        wanderlist_visibility: (profile.wanderlist_visibility as VisibilityOption) || 'friends_only',
        travel_pals_visibility: (profile.travel_pals_visibility as VisibilityOption) || 'friends_only',
        stats_visibility: (profile.stats_visibility as VisibilityOption) || 'friends_only',
      });
    }
  }, [profile, open]);

  const getInitials = () => {
    if (fullName) {
      return fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (username) {
      return username.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const handleSave = async () => {
    if (!profile) return;
    
    setIsSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName || null,
        username,
        bio: bio || null,
        ...visibilitySettings,
      })
      .eq('id', profile.id);
    
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
      onProfileUpdate();
      onOpenChange(false);
      toast({ title: 'Saved', description: 'Your profile has been updated.' });
    }
  };

  const updateVisibility = (key: string, value: VisibilityOption) => {
    setVisibilitySettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Edit Profile</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="profile" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile" className="gap-2">
                <User className="w-4 h-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="visibility" className="gap-2">
                <Eye className="w-4 h-4" />
                Visibility
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile" className="space-y-6 mt-6">
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

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Full Name</Label>
                  <Input 
                    id="edit-name" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    className="bg-background" 
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="edit-username">Username</Label>
                  <Input 
                    id="edit-username" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-background" 
                  />
                  <p className="text-xs text-muted-foreground">
                    Travel Pals can find you by your exact username
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-bio">Bio</Label>
                  <Input 
                    id="edit-bio" 
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="A short bio about yourself"
                    className="bg-background" 
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="visibility" className="space-y-4 mt-6">
              <p className="text-sm text-muted-foreground mb-4">
                Control what others can see on your profile
              </p>
              
              <div className="space-y-4">
                {visibilitySections.map(section => (
                  <div key={section.key} className="flex items-center justify-between gap-4">
                    <Label className="font-medium">{section.label}</Label>
                    <Select
                      value={visibilitySettings[section.key]}
                      onValueChange={(value) => updateVisibility(section.key, value as VisibilityOption)}
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {visibilityOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex flex-col">
                              <span>{option.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              
              <div className="text-xs text-muted-foreground mt-4 p-3 bg-muted/50 rounded-lg">
                <p><strong>Public:</strong> Anyone viewing your profile can see this</p>
                <p><strong>Travel Pals Only:</strong> Only your Travel Pals can see this</p>
                <p><strong>Private:</strong> Only you can see this</p>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <AvatarEditorDialog
        open={avatarDialogOpen}
        onOpenChange={setAvatarDialogOpen}
        userId={profile.id}
        currentAvatarUrl={avatarUrl}
        onAvatarUpdate={(url) => {
          setAvatarUrl(url);
          onProfileUpdate();
        }}
      />
    </>
  );
}

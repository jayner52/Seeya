import { useState, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Upload,
  Plane,
  Globe,
  Map,
  Palmtree,
  Compass,
  Mountain,
  Ship,
  Camera,
  Tent,
  Bike,
  Train,
  Car,
  Anchor,
  Sunrise,
  TreePine,
  type LucideIcon,
} from 'lucide-react';

interface AvatarEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentAvatarUrl?: string | null;
  onAvatarUpdate: (url: string) => void;
}

const TRAVEL_ICONS: { icon: LucideIcon; name: string }[] = [
  { icon: Plane, name: 'plane' },
  { icon: Globe, name: 'globe' },
  { icon: Map, name: 'map' },
  { icon: Palmtree, name: 'palmtree' },
  { icon: Compass, name: 'compass' },
  { icon: Mountain, name: 'mountain' },
  { icon: Ship, name: 'ship' },
  { icon: Camera, name: 'camera' },
  { icon: Tent, name: 'tent' },
  { icon: Bike, name: 'bike' },
  { icon: Train, name: 'train' },
  { icon: Car, name: 'car' },
  { icon: Anchor, name: 'anchor' },
  { icon: Sunrise, name: 'sunrise' },
  { icon: TreePine, name: 'tree' },
];

const BRAND_COLORS = [
  { name: 'Yellow', value: 'hsl(56, 97%, 58%)', class: 'bg-primary' },
  { name: 'Purple', value: 'hsl(266, 69%, 86%)', class: 'bg-secondary' },
  { name: 'Green', value: 'hsl(124, 38%, 80%)', class: 'bg-[hsl(124,38%,80%)]' },
  { name: 'Deep Green', value: 'hsl(136, 51%, 16%)', class: 'bg-[hsl(136,51%,16%)]' },
  { name: 'Coral', value: 'hsl(12, 76%, 61%)', class: 'bg-[hsl(12,76%,61%)]' },
  { name: 'Sky', value: 'hsl(199, 89%, 70%)', class: 'bg-[hsl(199,89%,70%)]' },
];

export function AvatarEditorDialog({
  open,
  onOpenChange,
  userId,
  currentAvatarUrl,
  onAvatarUpdate,
}: AvatarEditorDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Upload tab state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState([1]);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Icon tab state
  const [selectedIcon, setSelectedIcon] = useState<string>('plane');
  const [selectedColor, setSelectedColor] = useState(BRAND_COLORS[0].value);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file (JPG, PNG, or WebP)',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image under 5MB',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setZoom([1]);
    setPosition({ x: 0, y: 0 });
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      // Create a canvas to crop/resize the image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      const img = new Image();
      img.src = previewUrl!;
      
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // Set canvas size to 256x256 for avatar
      canvas.width = 256;
      canvas.height = 256;

      // Calculate source dimensions based on zoom and position
      const scale = zoom[0];
      const srcSize = Math.min(img.width, img.height) / scale;
      const srcX = (img.width - srcSize) / 2 - (position.x * srcSize / 100);
      const srcY = (img.height - srcSize) / 2 - (position.y * srcSize / 100);

      // Draw circular clip
      ctx.beginPath();
      ctx.arc(128, 128, 128, 0, Math.PI * 2);
      ctx.clip();

      // Draw image
      ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, 256, 256);

      // Convert to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/png', 0.9);
      });

      // Upload to Supabase storage
      const fileName = `${userId}/avatar.png`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
          upsert: true,
          contentType: 'image/png',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Add cache-busting parameter
      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlWithCacheBust })
        .eq('id', userId);

      if (updateError) throw updateError;

      onAvatarUpdate(urlWithCacheBust);
      toast({ title: 'Success', description: 'Your avatar has been updated!' });
      onOpenChange(false);
      resetState();
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload avatar',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const generateIconAvatar = async () => {
    setIsGenerating(true);
    try {
      const IconComponent = TRAVEL_ICONS.find(i => i.name === selectedIcon)?.icon || Plane;
      
      // Create SVG avatar
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      // Draw background circle
      ctx.fillStyle = selectedColor;
      ctx.beginPath();
      ctx.arc(128, 128, 128, 0, Math.PI * 2);
      ctx.fill();

      // Draw icon using a temporary SVG
      const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      iconSvg.setAttribute('width', '128');
      iconSvg.setAttribute('height', '128');
      iconSvg.setAttribute('viewBox', '0 0 24 24');
      iconSvg.setAttribute('fill', 'none');
      iconSvg.setAttribute('stroke', 'currentColor');
      iconSvg.setAttribute('stroke-width', '2');
      iconSvg.setAttribute('stroke-linecap', 'round');
      iconSvg.setAttribute('stroke-linejoin', 'round');
      
      // Get the icon path data - we'll draw a simple version
      // For now, draw the icon as text representation
      ctx.fillStyle = selectedColor === 'hsl(136, 51%, 16%)' ? '#fff' : '#1a1a1a';
      ctx.font = 'bold 100px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Use emoji as fallback for icon representation
      const iconEmojis: Record<string, string> = {
        plane: '✈️',
        globe: '🌍',
        map: '🗺️',
        palmtree: '🌴',
        compass: '🧭',
        mountain: '⛰️',
        ship: '🚢',
        camera: '📷',
        tent: '⛺',
        bike: '🚴',
        train: '🚂',
        car: '🚗',
        anchor: '⚓',
        sunrise: '🌅',
        tree: '🌲',
      };
      
      ctx.font = '100px sans-serif';
      ctx.fillText(iconEmojis[selectedIcon] || '✈️', 128, 128);

      // Convert to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/png', 0.9);
      });

      // Upload to Supabase storage
      const fileName = `${userId}/avatar.png`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
          upsert: true,
          contentType: 'image/png',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlWithCacheBust })
        .eq('id', userId);

      if (updateError) throw updateError;

      onAvatarUpdate(urlWithCacheBust);
      toast({ title: 'Success', description: 'Your avatar has been updated!' });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Failed to create avatar',
        description: error.message || 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const resetState = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setZoom([1]);
    setPosition({ x: 0, y: 0 });
  };

  const SelectedIconComponent = TRAVEL_ICONS.find(i => i.name === selectedIcon)?.icon || Plane;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Change Profile Photo</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload Photo</TabsTrigger>
            <TabsTrigger value="icon">Choose Icon</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4 mt-4">
            {/* Drop zone */}
            <div
              className={cn(
                'relative border-2 border-dashed rounded-xl p-8 text-center transition-colors',
                isDragging ? 'border-primary bg-primary/5' : 'border-border',
                previewUrl && 'p-4'
              )}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {previewUrl ? (
                <div className="space-y-4">
                  {/* Preview with crop */}
                  <div className="relative w-40 h-40 mx-auto overflow-hidden rounded-full border-4 border-secondary">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="absolute w-full h-full object-cover"
                      style={{
                        transform: `scale(${zoom[0]}) translate(${position.x}%, ${position.y}%)`,
                      }}
                    />
                  </div>

                  {/* Zoom control */}
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Zoom</label>
                    <Slider
                      value={zoom}
                      onValueChange={setZoom}
                      min={1}
                      max={3}
                      step={0.1}
                      className="w-full"
                    />
                  </div>

                  {/* Position controls */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Horizontal</label>
                      <Slider
                        value={[position.x]}
                        onValueChange={([x]) => setPosition(p => ({ ...p, x }))}
                        min={-50}
                        max={50}
                        step={1}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Vertical</label>
                      <Slider
                        value={[position.y]}
                        onValueChange={([y]) => setPosition(p => ({ ...p, y }))}
                        min={-50}
                        max={50}
                        step={1}
                      />
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      resetState();
                    }}
                  >
                    Choose Different Image
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Drop your image here</p>
                    <p className="text-sm text-muted-foreground">or click to browse</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Select Image
                  </Button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
            </div>

            {previewUrl && (
              <Button
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full"
              >
                {isUploading ? 'Uploading...' : 'Save Photo'}
              </Button>
            )}
          </TabsContent>

          <TabsContent value="icon" className="space-y-4 mt-4">
            {/* Icon preview */}
            <div
              className="w-32 h-32 mx-auto rounded-full flex items-center justify-center transition-colors"
              style={{ backgroundColor: selectedColor }}
            >
              <SelectedIconComponent 
                className={cn(
                  'w-16 h-16',
                  selectedColor === 'hsl(136, 51%, 16%)' ? 'text-white' : 'text-foreground'
                )} 
              />
            </div>

            {/* Color selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Background Color</label>
              <div className="flex gap-2 justify-center">
                {BRAND_COLORS.map((color) => (
                  <button
                    key={color.name}
                    className={cn(
                      'w-10 h-10 rounded-full transition-transform hover:scale-110',
                      selectedColor === color.value && 'ring-2 ring-offset-2 ring-foreground'
                    )}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setSelectedColor(color.value)}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Icon selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Travel Icon</label>
              <div className="grid grid-cols-5 gap-2">
                {TRAVEL_ICONS.map(({ icon: Icon, name }) => (
                  <button
                    key={name}
                    className={cn(
                      'p-3 rounded-lg border transition-colors hover:bg-muted',
                      selectedIcon === name && 'border-primary bg-primary/10'
                    )}
                    onClick={() => setSelectedIcon(name)}
                  >
                    <Icon className="w-6 h-6 mx-auto" />
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={generateIconAvatar}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? 'Creating...' : 'Save Icon Avatar'}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

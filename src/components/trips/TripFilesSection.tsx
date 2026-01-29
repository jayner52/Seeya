import { useMemo, useState, useEffect } from 'react';
import { FileText, Image as ImageIcon, Download, ExternalLink, FolderOpen, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Tripbit } from '@/hooks/useTripbits';
import { TripLocation } from '@/hooks/useTripLocations';
import { TripbitAttachment } from './TripbitFileUpload';
import { getCategoryConfig } from '@/lib/tripbitCategoryConfig';
import { format, parseISO } from 'date-fns';

interface TripFilesSectionProps {
  tripbits: Tripbit[];
  locations: TripLocation[];
}

interface FileWithContext extends TripbitAttachment {
  tripbitId: string;
  tripbitTitle: string;
  tripbitCategory: string;
  locationId?: string | null;
  locationName?: string;
}

export function TripFilesSection({ tripbits, locations }: TripFilesSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'image' | 'document'>('all');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  // Extract all files from all tripbits
  const allFiles = useMemo(() => {
    const files: FileWithContext[] = [];

    tripbits.forEach(tripbit => {
      const metadata = tripbit.metadata as Record<string, unknown> | null;
      const attachments = (metadata?.attachments as TripbitAttachment[]) || [];
      
      const location = locations.find(l => l.id === tripbit.location_id);

      attachments.forEach(attachment => {
        files.push({
          ...attachment,
          tripbitId: tripbit.id,
          tripbitTitle: tripbit.title,
          tripbitCategory: tripbit.category,
          locationId: tripbit.location_id,
          locationName: location?.destination?.split(',')[0],
        });
      });
    });

    // Sort by upload date (newest first)
    return files.sort((a, b) => 
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  }, [tripbits, locations]);

  // Filter files
  const filteredFiles = useMemo(() => {
    return allFiles.filter(file => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!file.filename.toLowerCase().includes(query) && 
            !file.tripbitTitle.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Type filter
      if (filterType === 'image' && !file.type.startsWith('image/')) return false;
      if (filterType === 'document' && file.type.startsWith('image/')) return false;

      // Location filter
      if (filterLocation !== 'all' && file.locationId !== filterLocation) return false;

      return true;
    });
  }, [allFiles, searchQuery, filterType, filterLocation]);

  // Fetch signed URLs for all files
  useEffect(() => {
    const fetchSignedUrls = async () => {
      const urls: Record<string, string> = {};
      
      for (const file of allFiles) {
        if (!signedUrls[file.path]) {
          try {
            const { data, error } = await supabase.storage
              .from('trip-files')
              .createSignedUrl(file.path, 3600); // 1 hour expiry
            
            if (!error && data?.signedUrl) {
              urls[file.path] = data.signedUrl;
            }
          } catch (err) {
            console.error('Error getting signed URL:', err);
          }
        }
      }
      
      if (Object.keys(urls).length > 0) {
        setSignedUrls(prev => ({ ...prev, ...urls }));
      }
    };

    if (allFiles.length > 0) {
      fetchSignedUrls();
    }
  }, [allFiles]);

  const getFileUrl = (path: string) => {
    return signedUrls[path] || '';
  };

  const downloadFile = async (file: FileWithContext) => {
    try {
      const { data, error } = await supabase.storage
        .from('trip-files')
        .download(file.path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const isImage = (type: string) => type.startsWith('image/');

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (allFiles.length === 0) {
    return (
      <div className="text-center py-8">
        <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground">No files uploaded yet</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Upload files to your tripbits to see them here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="document">Documents</SelectItem>
            </SelectContent>
          </Select>
          {locations.length > 0 && (
            <Select value={filterLocation} onValueChange={setFilterLocation}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                {locations.map(loc => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.destination.split(',')[0]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* File count */}
      <p className="text-sm text-muted-foreground">
        {filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''}
        {filteredFiles.length !== allFiles.length && ` (${allFiles.length} total)`}
      </p>

      {/* Files grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredFiles.map((file) => {
          const categoryConfig = getCategoryConfig(file.tripbitCategory as any);
          const CategoryIcon = categoryConfig.icon;

          return (
            <div
              key={`${file.tripbitId}-${file.id}`}
              className="group bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-colors"
            >
              {/* Preview */}
              {isImage(file.type) ? (
                <div className="aspect-video bg-muted relative">
                  <img
                    src={getFileUrl(file.path)}
                    alt={file.filename}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => window.open(getFileUrl(file.path), '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <FileText className="h-12 w-12 text-muted-foreground/50" />
                </div>
              )}

              {/* Info */}
              <div className="p-3 space-y-2">
                <p className="text-sm font-medium truncate" title={file.filename}>
                  {file.filename}
                </p>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className={cn("p-1 rounded", categoryConfig.colorClass)}>
                    <CategoryIcon className="h-3 w-3 text-white" />
                  </div>
                  <span className="truncate flex-1">{file.tripbitTitle}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {file.locationName && (
                      <Badge variant="outline" className="text-xs">
                        {file.locationName}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => downloadFile(file)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredFiles.length === 0 && allFiles.length > 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No files match your filters</p>
        </div>
      )}
    </div>
  );
}

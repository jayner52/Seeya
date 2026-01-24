import { useState, useCallback, useEffect } from 'react';
import { Upload, X, FileText, Image as ImageIcon, Loader2, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TripbitAttachment {
  id: string;
  path: string;
  filename: string;
  type: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
}

interface TripbitFileUploadProps {
  tripId: string;
  tripbitId?: string; // Optional - if editing existing tripbit
  attachments: TripbitAttachment[];
  onAttachmentsChange: (attachments: TripbitAttachment[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
}

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export function TripbitFileUpload({
  tripId,
  tripbitId,
  attachments,
  onAttachmentsChange,
  maxFiles = 10,
  maxSizeMB = 10,
}: TripbitFileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<{ file: File; preview?: string }[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  // Fetch signed URLs for attachments
  useEffect(() => {
    const fetchSignedUrls = async () => {
      const urls: Record<string, string> = {};
      
      for (const attachment of attachments) {
        if (!signedUrls[attachment.path]) {
          try {
            const { data, error } = await supabase.storage
              .from('trip-files')
              .createSignedUrl(attachment.path, 3600); // 1 hour expiry
            
            if (!error && data?.signedUrl) {
              urls[attachment.path] = data.signedUrl;
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

    if (attachments.length > 0) {
      fetchSignedUrls();
    }
  }, [attachments]);

  const isImage = (type: string) => type.startsWith('image/');

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles: File[] = [];

    for (const file of fileArray) {
      if (!ALLOWED_TYPES.includes(file.type) && !file.name.toLowerCase().endsWith('.heic')) {
        toast.error(`${file.name}: Invalid file type`);
        continue;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast.error(`${file.name}: File too large (max ${maxSizeMB}MB)`);
        continue;
      }
      if (attachments.length + pendingFiles.length + validFiles.length >= maxFiles) {
        toast.error(`Maximum ${maxFiles} files allowed`);
        break;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // If we have a tripbitId, upload immediately
    if (tripbitId) {
      setUploading(true);
      const newAttachments: TripbitAttachment[] = [];

      for (const file of validFiles) {
        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${crypto.randomUUID()}.${fileExt}`;
          const filePath = `${tripId}/${tripbitId}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('trip-files')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data: { user } } = await supabase.auth.getUser();

          newAttachments.push({
            id: crypto.randomUUID(),
            path: filePath,
            filename: file.name,
            type: file.type,
            size: file.size,
            uploadedAt: new Date().toISOString(),
            uploadedBy: user?.id || '',
          });
        } catch (error) {
          console.error('Upload error:', error);
          toast.error(`Failed to upload ${file.name}`);
        }
      }

      if (newAttachments.length > 0) {
        onAttachmentsChange([...attachments, ...newAttachments]);
        toast.success(`${newAttachments.length} file(s) uploaded`);
      }
      setUploading(false);
    } else {
      // No tripbitId yet (new tripbit) - queue files for upload after creation
      const newPending = validFiles.map(file => ({
        file,
        preview: isImage(file.type) ? URL.createObjectURL(file) : undefined,
      }));
      setPendingFiles(prev => [...prev, ...newPending]);
    }
  }, [tripId, tripbitId, attachments, pendingFiles, maxFiles, maxSizeMB, onAttachmentsChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removeAttachment = async (attachment: TripbitAttachment) => {
    try {
      const { error } = await supabase.storage
        .from('trip-files')
        .remove([attachment.path]);

      if (error) throw error;

      onAttachmentsChange(attachments.filter(a => a.id !== attachment.id));
      toast.success('File removed');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to remove file');
    }
  };

  const removePendingFile = (index: number) => {
    const file = pendingFiles[index];
    if (file.preview) URL.revokeObjectURL(file.preview);
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Get pending files for parent to upload after tripbit creation
  const getPendingFiles = () => pendingFiles.map(p => p.file);

  // Expose method to upload pending files after tripbit creation
  const uploadPendingFiles = async (newTripbitId: string): Promise<TripbitAttachment[]> => {
    if (pendingFiles.length === 0) return [];

    const uploaded: TripbitAttachment[] = [];
    const { data: { user } } = await supabase.auth.getUser();

    for (const { file } of pendingFiles) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${tripId}/${newTripbitId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('trip-files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        uploaded.push({
          id: crypto.randomUUID(),
          path: filePath,
          filename: file.name,
          type: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          uploadedBy: user?.id || '',
        });
      } catch (error) {
        console.error('Upload error:', error);
      }
    }

    // Clean up previews
    pendingFiles.forEach(p => {
      if (p.preview) URL.revokeObjectURL(p.preview);
    });
    setPendingFiles([]);

    return uploaded;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileUrl = (path: string) => {
    return signedUrls[path] || '';
  };

  const totalFiles = attachments.length + pendingFiles.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Paperclip className="h-4 w-4" />
          Attachments
          {totalFiles > 0 && (
            <span className="text-xs text-muted-foreground">({totalFiles}/{maxFiles})</span>
          )}
        </div>
      </div>

      {/* Drop zone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer",
          isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
          uploading && "pointer-events-none opacity-50"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.multiple = true;
          input.accept = ALLOWED_TYPES.join(',');
          input.onchange = (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files) handleFiles(files);
          };
          input.click();
        }}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Drop files here or click to upload
            </p>
            <p className="text-xs text-muted-foreground">
              Images, PDFs, documents (max {maxSizeMB}MB each)
            </p>
          </div>
        )}
      </div>

      {/* Existing attachments */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-3 p-2 rounded-md bg-muted/50 group"
            >
              {isImage(attachment.type) ? (
                <div className="h-10 w-10 rounded overflow-hidden bg-muted shrink-0">
                  <img
                    src={getFileUrl(attachment.path)}
                    alt={attachment.filename}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{attachment.filename}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  removeAttachment(attachment);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Pending files (for new tripbits) */}
      {pendingFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Will be uploaded when tripbit is saved:</p>
          {pendingFiles.map((pending, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-2 rounded-md bg-muted/50 border border-dashed border-primary/30 group"
            >
              {pending.preview ? (
                <div className="h-10 w-10 rounded overflow-hidden bg-muted shrink-0">
                  <img
                    src={pending.preview}
                    alt={pending.file.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{pending.file.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(pending.file.size)}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  removePendingFile(index);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Hook for managing file uploads in dialog
export function useTripbitFiles(tripId: string) {
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [attachments, setAttachments] = useState<TripbitAttachment[]>([]);

  const addPendingFile = (file: File) => {
    setPendingFiles(prev => [...prev, file]);
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadPendingFiles = async (tripbitId: string): Promise<TripbitAttachment[]> => {
    if (pendingFiles.length === 0) return [];

    const uploaded: TripbitAttachment[] = [];
    const { data: { user } } = await supabase.auth.getUser();

    for (const file of pendingFiles) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${tripId}/${tripbitId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('trip-files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        uploaded.push({
          id: crypto.randomUUID(),
          path: filePath,
          filename: file.name,
          type: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          uploadedBy: user?.id || '',
        });
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setPendingFiles([]);
    return uploaded;
  };

  const reset = () => {
    setPendingFiles([]);
    setAttachments([]);
  };

  return {
    pendingFiles,
    attachments,
    setAttachments,
    addPendingFile,
    removePendingFile,
    uploadPendingFiles,
    reset,
  };
}

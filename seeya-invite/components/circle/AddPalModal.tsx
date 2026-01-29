'use client';

import { X } from 'lucide-react';
import { UserSearchInput } from './UserSearchInput';

interface AddPalModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  existingFriendIds: string[];
  onSendRequest: (userId: string) => Promise<void>;
}

export function AddPalModal({
  isOpen,
  onClose,
  currentUserId,
  existingFriendIds,
  onSendRequest,
}: AddPalModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-xl max-h-[80vh] overflow-auto animate-fadeIn">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-seeya-text">Add Travel Pal</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-seeya-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-seeya-text-secondary mb-4">
            Search for friends to add to your travel circle
          </p>
          <UserSearchInput
            currentUserId={currentUserId}
            existingFriendIds={existingFriendIds}
            onSendRequest={async (userId) => {
              await onSendRequest(userId);
            }}
          />
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Smile } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  disabled?: boolean;
}

const EMOJI_CATEGORIES = {
  'Smileys': ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😍', '🥰', '😘', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷'],
  'Gestures': ['👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤌', '👈', '👉', '👆', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏', '🙌', '🤲', '🙏', '💪', '🦵', '🦶'],
  'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
  'Travel': ['✈️', '🚀', '🛫', '🛬', '🌍', '🌎', '🌏', '🗺️', '🧭', '🏔️', '⛰️', '🌋', '🏕️', '🏖️', '🏝️', '🏜️', '🌅', '🌄', '🌠', '🎇', '🎆', '🌈', '☀️', '🌤️', '⛅', '🌦️', '🌧️', '⛈️', '🌨️', '❄️'],
  'Food': ['🍕', '🍔', '🍟', '🌭', '🥪', '🌮', '🌯', '🥗', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧'],
  'Activities': ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🏓', '🏸', '🏒', '🥊', '🥋', '⛳', '⛷️', '🎿', '🛷', '🥌', '🎯', '🪃', '🎳', '🎮', '🎲', '🧩', '🎭', '🎨', '🎬', '🎤'],
  'Objects': ['📱', '💻', '🖥️', '📷', '📸', '🎥', '📹', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷'],
  'Celebrations': ['🎉', '🎊', '🎈', '🎁', '🎀', '🪅', '🪆', '🎇', '🎆', '✨', '🎄', '🎃', '🪔', '🎍', '🎋', '🎐', '🎑', '🧧', '🎎', '🎏', '🥳', '🎂', '🍾', '🥂', '🍻', '🥃', '🍷', '🍸', '🍹', '🧉'],
};

export function EmojiPicker({ onEmojiSelect, disabled }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<keyof typeof EMOJI_CATEGORIES>('Smileys');

  const handleSelect = (emoji: string) => {
    onEmojiSelect(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          className="h-9 w-9"
        >
          <Smile className="w-5 h-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="start" side="top">
        {/* Category tabs */}
        <div className="flex gap-1 mb-2 overflow-x-auto pb-2 border-b border-border">
          {Object.keys(EMOJI_CATEGORIES).map((category) => (
            <Button
              key={category}
              variant="ghost"
              size="sm"
              className={cn(
                "text-xs px-2 py-1 h-7 flex-shrink-0",
                activeCategory === category && "bg-muted"
              )}
              onClick={() => setActiveCategory(category as keyof typeof EMOJI_CATEGORIES)}
            >
              {category}
            </Button>
          ))}
        </div>
        
        {/* Emoji grid */}
        <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
          {EMOJI_CATEGORIES[activeCategory].map((emoji, idx) => (
            <button
              key={idx}
              className="text-xl p-1.5 hover:bg-muted rounded transition-colors"
              onClick={() => handleSelect(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

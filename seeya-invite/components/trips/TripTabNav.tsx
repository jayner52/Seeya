'use client';

import { cn } from '@/lib/utils/cn';
import { ClipboardList, Calendar } from 'lucide-react';

export type TripTab = 'planning' | 'itinerary';

interface TripTabNavProps {
  activeTab: TripTab;
  onTabChange: (tab: TripTab) => void;
  className?: string;
}

const tabs: { id: TripTab; label: string; icon: typeof ClipboardList }[] = [
  { id: 'planning', label: 'Planning', icon: ClipboardList },
  { id: 'itinerary', label: 'Itinerary', icon: Calendar },
];

export function TripTabNav({ activeTab, onTabChange, className }: TripTabNavProps) {
  return (
    <div className={cn('flex bg-gray-100 p-1 rounded-xl', className)}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all',
              isActive
                ? 'bg-white text-seeya-purple shadow-sm'
                : 'text-seeya-text-secondary hover:text-seeya-text'
            )}
          >
            <Icon size={18} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

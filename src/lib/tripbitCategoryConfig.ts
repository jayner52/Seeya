import { Plane, Home, Car, Target, DollarSign, Calendar, FileText, MoreHorizontal, FolderOpen, Camera, Train } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type TripbitCategoryType = 
  | 'flight' 
  | 'accommodation' 
  | 'rental_car' 
  | 'activity' 
  | 'transportation' 
  | 'money' 
  | 'reservation' 
  | 'document' 
  | 'photos'
  | 'other';

export interface CategoryConfig {
  icon: LucideIcon;
  label: string;
  labelPlural: string;
  colorClass: string;      // solid bg (e.g., 'bg-sky-500')
  bgClass: string;         // light bg (e.g., 'bg-sky-100')
  textClass: string;       // text color (e.g., 'text-sky-700')
}

export const categoryConfig: Record<TripbitCategoryType, CategoryConfig> = {
  flight: { 
    icon: Plane, 
    label: 'Flight', 
    labelPlural: 'Flights', 
    colorClass: 'bg-sky-500', 
    bgClass: 'bg-sky-100', 
    textClass: 'text-sky-700' 
  },
  accommodation: { 
    icon: Home, 
    label: 'Stay', 
    labelPlural: 'Stays', 
    colorClass: 'bg-blue-500', 
    bgClass: 'bg-blue-100', 
    textClass: 'text-blue-700' 
  },
  rental_car: { 
    icon: Car, 
    label: 'Car', 
    labelPlural: 'Cars', 
    colorClass: 'bg-orange-500', 
    bgClass: 'bg-orange-100', 
    textClass: 'text-orange-700' 
  },
  activity: { 
    icon: Target, 
    label: 'Activity', 
    labelPlural: 'Activities', 
    colorClass: 'bg-emerald-500', 
    bgClass: 'bg-emerald-100', 
    textClass: 'text-emerald-700' 
  },
  transportation: { 
    icon: Train, 
    label: 'Transport', 
    labelPlural: 'Transport', 
    colorClass: 'bg-purple-500', 
    bgClass: 'bg-purple-100', 
    textClass: 'text-purple-700' 
  },
  money: { 
    icon: DollarSign, 
    label: 'Money', 
    labelPlural: 'Money', 
    colorClass: 'bg-green-500', 
    bgClass: 'bg-green-100', 
    textClass: 'text-green-700' 
  },
  reservation: { 
    icon: Calendar, 
    label: 'Reservation', 
    labelPlural: 'Reservations', 
    colorClass: 'bg-pink-500', 
    bgClass: 'bg-pink-100', 
    textClass: 'text-pink-700' 
  },
  document: { 
    icon: FileText, 
    label: 'Document', 
    labelPlural: 'Docs', 
    colorClass: 'bg-amber-500', 
    bgClass: 'bg-amber-100', 
    textClass: 'text-amber-700' 
  },
  photos: {
    icon: Camera, 
    label: 'Photos', 
    labelPlural: 'Photos', 
    colorClass: 'bg-rose-500', 
    bgClass: 'bg-rose-100', 
    textClass: 'text-rose-700' 
  },
  other: { 
    icon: MoreHorizontal, 
    label: 'Other', 
    labelPlural: 'Other', 
    colorClass: 'bg-slate-500', 
    bgClass: 'bg-slate-100', 
    textClass: 'text-slate-700' 
  },
};

// Special 'all' filter option for TripbitsGrid
export const allFilterOption = { 
  icon: FolderOpen, 
  label: 'All', 
  colorClass: 'bg-gray-500', 
  bgClass: 'bg-gray-100', 
  textClass: 'text-gray-700' 
};

// Helper to get config with fallback
export const getCategoryConfig = (category: string): CategoryConfig => {
  return categoryConfig[category as TripbitCategoryType] || categoryConfig.other;
};

// Friend color palette with visually distinct colors
// Each friend gets a unique color assignment stored in localStorage

export interface FriendColor {
  bg: string;       // Background class (30% opacity)
  bgSolid: string;  // Solid background class
  dot: string;      // Dot/badge color class
  text: string;     // Text color class
  border: string;   // Border color class
  name: string;     // Color name for debugging
}

// Palette of 12 distinct colors that work well on both light and dark backgrounds
const COLOR_PALETTE: FriendColor[] = [
  { 
    bg: 'bg-amber-400/50 ring-1 ring-amber-600', 
    bgSolid: 'bg-amber-500',
    dot: 'bg-amber-500', 
    text: 'text-amber-800 dark:text-amber-200',
    border: 'border-amber-600',
    name: 'amber'
  },
  { 
    bg: 'bg-teal-500/30', 
    bgSolid: 'bg-teal-500',
    dot: 'bg-teal-500', 
    text: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-500',
    name: 'teal'
  },
  { 
    bg: 'bg-rose-500/30', 
    bgSolid: 'bg-rose-500',
    dot: 'bg-rose-500', 
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-500',
    name: 'rose'
  },
  { 
    bg: 'bg-indigo-500/30', 
    bgSolid: 'bg-indigo-500',
    dot: 'bg-indigo-500', 
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-500',
    name: 'indigo'
  },
  { 
    bg: 'bg-emerald-500/30', 
    bgSolid: 'bg-emerald-500',
    dot: 'bg-emerald-500', 
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-500',
    name: 'emerald'
  },
  { 
    bg: 'bg-orange-500/30', 
    bgSolid: 'bg-orange-500',
    dot: 'bg-orange-500', 
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-500',
    name: 'orange'
  },
  { 
    bg: 'bg-cyan-500/30', 
    bgSolid: 'bg-cyan-500',
    dot: 'bg-cyan-500', 
    text: 'text-cyan-700 dark:text-cyan-300',
    border: 'border-cyan-500',
    name: 'cyan'
  },
  { 
    bg: 'bg-pink-500/30', 
    bgSolid: 'bg-pink-500',
    dot: 'bg-pink-500', 
    text: 'text-pink-700 dark:text-pink-300',
    border: 'border-pink-500',
    name: 'pink'
  },
  { 
    bg: 'bg-lime-500/30', 
    bgSolid: 'bg-lime-500',
    dot: 'bg-lime-500', 
    text: 'text-lime-700 dark:text-lime-300',
    border: 'border-lime-500',
    name: 'lime'
  },
  { 
    bg: 'bg-violet-500/30', 
    bgSolid: 'bg-violet-500',
    dot: 'bg-violet-500', 
    text: 'text-violet-700 dark:text-violet-300',
    border: 'border-violet-500',
    name: 'violet'
  },
  { 
    bg: 'bg-sky-500/30', 
    bgSolid: 'bg-sky-500',
    dot: 'bg-sky-500', 
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-500',
    name: 'sky'
  },
  { 
    bg: 'bg-fuchsia-500/30', 
    bgSolid: 'bg-fuchsia-500',
    dot: 'bg-fuchsia-500', 
    text: 'text-fuchsia-700 dark:text-fuchsia-300',
    border: 'border-fuchsia-500',
    name: 'fuchsia'
  },
];

const STORAGE_KEY = 'calendar-friend-colors';

interface ColorAssignments {
  [friendId: string]: number; // Maps friend ID to color index
}

// Load color assignments from localStorage
function loadColorAssignments(): ColorAssignments {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

// Save color assignments to localStorage
function saveColorAssignments(assignments: ColorAssignments): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
}

// Get color for a specific friend (assigns new color if not already assigned)
export function getFriendColor(friendId: string): FriendColor {
  const assignments = loadColorAssignments();
  
  if (assignments[friendId] !== undefined) {
    return COLOR_PALETTE[assignments[friendId] % COLOR_PALETTE.length];
  }
  
  // Find the next available color index (least used)
  const usedIndices = Object.values(assignments);
  const indexCounts = new Array(COLOR_PALETTE.length).fill(0);
  usedIndices.forEach(idx => {
    indexCounts[idx % COLOR_PALETTE.length]++;
  });
  
  // Find the least used color index
  let minCount = Infinity;
  let newIndex = 0;
  for (let i = 0; i < indexCounts.length; i++) {
    if (indexCounts[i] < minCount) {
      minCount = indexCounts[i];
      newIndex = i;
    }
  }
  
  // Assign and save
  assignments[friendId] = newIndex;
  saveColorAssignments(assignments);
  
  return COLOR_PALETTE[newIndex];
}

// Get all color assignments (for bulk operations)
export function getAllFriendColors(friendIds: string[]): Map<string, FriendColor> {
  const colorMap = new Map<string, FriendColor>();
  friendIds.forEach(id => {
    colorMap.set(id, getFriendColor(id));
  });
  return colorMap;
}

// Get the "owner" color (purple/primary for user's own trips)
export function getOwnerColor(): FriendColor {
  return {
    bg: 'bg-primary/30',
    bgSolid: 'bg-primary',
    dot: 'bg-primary',
    text: 'text-primary-foreground',
    border: 'border-primary',
    name: 'primary'
  };
}

// Export palette for legend display
export function getColorPalette(): FriendColor[] {
  return COLOR_PALETTE;
}

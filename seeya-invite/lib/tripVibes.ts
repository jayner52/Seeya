// Trip Vibes - matching iOS app's TripNameGenerator
export interface TripVibe {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  adjectives: string[];
}

export const tripVibes: TripVibe[] = [
  // Event/Group Vibes
  { id: 'bachelor', name: 'Bachelor Party', icon: 'Users', adjectives: ['Epic', 'Legendary', 'Ultimate', 'Wild'] },
  { id: 'bachelorette', name: 'Bachelorette', icon: 'Sparkles', adjectives: ['Fabulous', 'Epic', 'Ultimate', 'Wild'] },
  { id: 'golf', name: 'Golf Trip', icon: 'Circle', adjectives: ['Epic', 'Ultimate', 'Championship', 'Links'] },
  { id: 'work', name: 'Work Trip', icon: 'Briefcase', adjectives: ['Business', 'Corporate', 'Team', 'Work'] },
  { id: 'girls', name: 'Girls Trip', icon: 'Crown', adjectives: ['Girls', 'Fabulous', 'Epic', 'Ultimate'] },
  { id: 'guys', name: 'Guys Trip', icon: 'Users', adjectives: ['Guys', 'Epic', 'Ultimate', 'Legendary'] },
  { id: 'sports', name: 'Sports Event', icon: 'Trophy', adjectives: ['Game Day', 'Championship', 'Ultimate', 'Epic'] },
  { id: 'anniversary', name: 'Anniversary', icon: 'HeartCircle', adjectives: ['Anniversary', 'Romantic', 'Special', 'Memorable'] },
  { id: 'birthday', name: 'Birthday Trip', icon: 'Gift', adjectives: ['Birthday', 'Celebratory', 'Special', 'Epic'] },
  { id: 'concert', name: 'Concert/Festival', icon: 'Music', adjectives: ['Festival', 'Music', 'Epic', 'Ultimate'] },
  { id: 'ski', name: 'Ski Trip', icon: 'Mountain', adjectives: ['Ski', 'Snowy', 'Mountain', 'Alpine'] },
  { id: 'honeymoon', name: 'Honeymoon', icon: 'Heart', adjectives: ['Honeymoon', 'Romantic', 'Dreamy', 'Blissful'] },

  // Activity Vibes
  { id: 'adventure', name: 'Adventure', icon: 'Compass', adjectives: ['Epic', 'Wild', 'Ultimate', 'Adventurous'] },
  { id: 'beach', name: 'Beach', icon: 'Umbrella', adjectives: ['Sunny', 'Tropical', 'Coastal', 'Sandy'] },
  { id: 'city', name: 'City Break', icon: 'Building2', adjectives: ['Urban', 'Metropolitan', 'Downtown', 'City'] },
  { id: 'romantic', name: 'Romantic', icon: 'Heart', adjectives: ['Romantic', 'Dreamy', 'Lovely', 'Enchanting'] },
  { id: 'family', name: 'Family', icon: 'Users', adjectives: ['Family', 'Fun-Filled', 'Memorable', 'Special'] },
  { id: 'foodie', name: 'Foodie', icon: 'UtensilsCrossed', adjectives: ['Culinary', 'Tasty', 'Gourmet', 'Delicious'] },
  { id: 'wellness', name: 'Wellness', icon: 'Leaf', adjectives: ['Relaxing', 'Peaceful', 'Zen', 'Rejuvenating'] },
  { id: 'cultural', name: 'Cultural', icon: 'Landmark', adjectives: ['Cultural', 'Historic', 'Artsy', 'Enriching'] },
  { id: 'nightlife', name: 'Nightlife', icon: 'PartyPopper', adjectives: ['Party', 'Vibrant', 'Electric', 'Night Out'] },
  { id: 'nature', name: 'Nature', icon: 'TreePine', adjectives: ['Natural', 'Scenic', 'Wilderness', 'Outdoor'] },
  { id: 'roadtrip', name: 'Road Trip', icon: 'Car', adjectives: ['Epic', 'Open Road', 'Cross-Country', 'Journey'] },
  { id: 'backpacking', name: 'Backpacking', icon: 'Backpack', adjectives: ['Backpacking', 'Explorer', 'Wandering', 'Discovery'] },
];

// Generate trip name suggestions
export function generateTripNameSuggestions(
  destinations: string[],
  selectedVibes: TripVibe[],
  startDate?: Date | null,
  count: number = 4
): string[] {
  const suggestions: string[] = [];

  if (destinations.length === 0) {
    return ['My Trip', 'New Adventure', 'Upcoming Trip', 'The Great Escape'];
  }

  const primaryCity = destinations[0];
  const shortCity = primaryCity.split(',')[0].trim();

  const getSeason = (date: Date): string => {
    const month = date.getMonth() + 1;
    if (month >= 3 && month <= 5) return 'Spring';
    if (month >= 6 && month <= 8) return 'Summer';
    if (month >= 9 && month <= 11) return 'Fall';
    return 'Winter';
  };

  if (selectedVibes.length === 0) {
    // No vibes selected - generic but fun names
    suggestions.push(`${shortCity} Getaway`);
    suggestions.push(`The ${shortCity} Trip`);
    if (startDate) {
      const season = getSeason(startDate);
      suggestions.push(`${season} in ${shortCity}`);
    }
    suggestions.push(`${shortCity} Adventures`);
    if (destinations.length > 1) {
      suggestions.push(`${shortCity} & Beyond`);
    }
  } else if (selectedVibes.length === 1) {
    // Single vibe - targeted names
    const vibe = selectedVibes[0];
    suggestions.push(...generateSingleVibeNames(vibe, shortCity, startDate));
  } else {
    // Multiple vibes - creative combinations
    suggestions.push(...generateMultiVibeNames(selectedVibes, shortCity, startDate));
  }

  // Ensure uniqueness and limit count
  const uniqueSuggestions: string[] = [];
  for (const suggestion of suggestions) {
    if (!uniqueSuggestions.includes(suggestion)) {
      uniqueSuggestions.push(suggestion);
    }
    if (uniqueSuggestions.length >= count) break;
  }

  return uniqueSuggestions;
}

function generateSingleVibeNames(vibe: TripVibe, city: string, startDate?: Date | null): string[] {
  const names: string[] = [];

  const getSeason = (date: Date): string => {
    const month = date.getMonth() + 1;
    if (month >= 3 && month <= 5) return 'Spring';
    if (month >= 6 && month <= 8) return 'Summer';
    if (month >= 9 && month <= 11) return 'Fall';
    return 'Winter';
  };

  switch (vibe.id) {
    case 'bachelor':
      names.push(`${city} Send-Off`, `The Last Hurrah: ${city}`, `${city} Bachelor Bash`, `Groom's ${city} Getaway`);
      break;
    case 'bachelorette':
      names.push(`${city} Before the Ring`, `Bride Tribe: ${city}`, `${city} Bachelorette Bash`, `Last Fling in ${city}`);
      break;
    case 'girls':
      names.push(`Girls Gone ${city}`, `${city} Queens Trip`, `Ladies of ${city}`, `${city} Girl Gang`);
      break;
    case 'guys':
      names.push(`Boys in ${city}`, `${city} Guys Trip`, `The ${city} Brotherhood`, `Dudes Do ${city}`);
      break;
    case 'golf':
      names.push(`${city} Links Trip`, `Tee Time in ${city}`, `${city} Golf Getaway`, `Fairways of ${city}`);
      break;
    case 'birthday':
      names.push(`Birthday in ${city}`, `${city} Birthday Bash`, `Celebrate in ${city}`, `Birthday Trip: ${city}`);
      break;
    case 'anniversary':
      names.push(`Anniversary in ${city}`, `${city} Love Trip`, `Our ${city} Escape`, `Romance in ${city}`);
      break;
    case 'honeymoon':
      names.push(`${city} Honeymoon`, `Newlyweds in ${city}`, `Just Married: ${city}`, `Honeymoon Bliss: ${city}`);
      break;
    case 'beach':
      names.push(`${city} Beach Escape`, `Sun & Sand: ${city}`, `${city} Shore Trip`, `Beachin' in ${city}`);
      break;
    case 'ski':
      names.push(`${city} Ski Trip`, `Slopes of ${city}`, `${city} Powder Run`, `Ski ${city}`);
      break;
    case 'concert':
      names.push(`${city} Music Trip`, `Festival Bound: ${city}`, `${city} Concert Getaway`, `Live in ${city}`);
      break;
    case 'foodie':
      names.push(`Taste of ${city}`, `${city} Food Tour`, `Eat Your Way Through ${city}`, `Foodie ${city}`);
      break;
    case 'adventure':
      names.push(`${city} Adventure`, `Wild ${city}`, `${city} Expedition`, `Adventure Awaits: ${city}`);
      break;
    case 'wellness':
      names.push(`${city} Wellness Retreat`, `Zen in ${city}`, `${city} Reset`, `Relax & Recharge: ${city}`);
      break;
    case 'nightlife':
      names.push(`${city} Nights`, `Party in ${city}`, `${city} After Dark`, `Night Out: ${city}`);
      break;
    case 'cultural':
      names.push(`Discover ${city}`, `${city} Culture Trip`, `Explore ${city}`, `Historic ${city}`);
      break;
    case 'work':
      names.push(`Team ${city}`, `${city} Offsite`, `Work Trip: ${city}`, `${city} Conference`);
      break;
    case 'roadtrip':
      names.push(`Road to ${city}`, `${city} Road Trip`, `Drive to ${city}`, `Open Road: ${city}`);
      break;
    default:
      if (vibe.adjectives.length > 0) {
        names.push(`${vibe.adjectives[0]} ${city}`, `${city} ${vibe.name}`, `${vibe.name} in ${city}`);
      }
  }

  if (startDate) {
    const season = getSeason(startDate);
    names.push(`${season} ${vibe.name}: ${city}`);
  }

  return names;
}

function generateMultiVibeNames(vibes: TripVibe[], city: string, startDate?: Date | null): string[] {
  const names: string[] = [];
  const vibeIds = new Set(vibes.map(v => v.id));

  const getSeason = (date: Date): string => {
    const month = date.getMonth() + 1;
    if (month >= 3 && month <= 5) return 'Spring';
    if (month >= 6 && month <= 8) return 'Summer';
    if (month >= 9 && month <= 11) return 'Fall';
    return 'Winter';
  };

  // Check for fun combinations
  if (vibeIds.has('girls') && vibeIds.has('beach')) {
    names.push(`Beach Babes: ${city}`, `${city} Sun Sisters`);
  }
  if (vibeIds.has('girls') && vibeIds.has('nightlife')) {
    names.push(`Girls Night Out: ${city}`, `${city} Queens Night`);
  }
  if (vibeIds.has('guys') && vibeIds.has('golf')) {
    names.push(`${city} Golf Bros`, `Tee Time with the Boys`);
  }
  if (vibeIds.has('bachelor') && vibeIds.has('nightlife')) {
    names.push(`Epic Bachelor Nights: ${city}`, `Groom's Last Party: ${city}`);
  }
  if (vibeIds.has('bachelorette') && vibeIds.has('beach')) {
    names.push(`Beach Bride Tribe: ${city}`, `Sandy Bachelorette: ${city}`);
  }
  if (vibeIds.has('bachelorette') && vibeIds.has('nightlife')) {
    names.push(`Last Fling Before the Ring`, `Bride Squad Nights: ${city}`);
  }
  if (vibeIds.has('foodie') && vibeIds.has('cultural')) {
    names.push(`Taste & Culture: ${city}`, `${city} Food & Art Tour`);
  }
  if (vibeIds.has('adventure') && vibeIds.has('nature')) {
    names.push(`Wild ${city} Expedition`, `${city} Outdoor Adventure`);
  }
  if (vibeIds.has('romantic') && vibeIds.has('beach')) {
    names.push(`Beach Romance: ${city}`, `Love on the Shore: ${city}`);
  }

  // If no specific combo matched, combine vibe names creatively
  if (names.length === 0) {
    const vibeNames = vibes.slice(0, 2).map(v => v.name);
    names.push(`${vibeNames.join(' & ')}: ${city}`);

    if (vibes.length > 0 && vibes[0].adjectives.length > 0) {
      names.push(`${vibes[0].adjectives[0]} ${city} Trip`);
    }
  }

  // Add generic multi-vibe options
  names.push(`The Ultimate ${city} Trip`);
  names.push(`${city} Experience`);

  if (startDate) {
    const season = getSeason(startDate);
    names.push(`${season} ${city} Escape`);
  }

  return names;
}

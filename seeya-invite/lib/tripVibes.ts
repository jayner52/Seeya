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

// Country → continent lookup (common travel destinations)
const COUNTRY_TO_CONTINENT: Record<string, string> = {
  // Asia
  Japan: 'Asia', China: 'Asia', 'South Korea': 'Asia', Korea: 'Asia',
  Thailand: 'Asia', Vietnam: 'Asia', Indonesia: 'Asia', Philippines: 'Asia',
  Malaysia: 'Asia', Singapore: 'Asia', India: 'Asia', Nepal: 'Asia',
  'Sri Lanka': 'Asia', Cambodia: 'Asia', Myanmar: 'Asia', Laos: 'Asia',
  Taiwan: 'Asia', 'Hong Kong': 'Asia', Macao: 'Asia', Macau: 'Asia',
  Mongolia: 'Asia', Bangladesh: 'Asia', Pakistan: 'Asia', Afghanistan: 'Asia',
  // Middle East
  UAE: 'Middle East', 'United Arab Emirates': 'Middle East',
  Qatar: 'Middle East', 'Saudi Arabia': 'Middle East', Israel: 'Middle East',
  Jordan: 'Middle East', Turkey: 'Middle East', Lebanon: 'Middle East',
  Oman: 'Middle East', Bahrain: 'Middle East', Kuwait: 'Middle East', Iran: 'Middle East',
  // Europe
  France: 'Europe', Italy: 'Europe', Spain: 'Europe', Portugal: 'Europe',
  Germany: 'Europe', 'United Kingdom': 'Europe', UK: 'Europe',
  Netherlands: 'Europe', Belgium: 'Europe', Switzerland: 'Europe',
  Austria: 'Europe', Greece: 'Europe', Croatia: 'Europe',
  'Czech Republic': 'Europe', Czechia: 'Europe', Poland: 'Europe',
  Hungary: 'Europe', Romania: 'Europe', Sweden: 'Europe', Norway: 'Europe',
  Denmark: 'Europe', Finland: 'Europe', Ireland: 'Europe', Scotland: 'Europe',
  Iceland: 'Europe', Slovakia: 'Europe', Slovenia: 'Europe', Serbia: 'Europe',
  Bulgaria: 'Europe', Albania: 'Europe', Montenegro: 'Europe',
  'Bosnia and Herzegovina': 'Europe', 'North Macedonia': 'Europe',
  Malta: 'Europe', Luxembourg: 'Europe', Monaco: 'Europe', Andorra: 'Europe',
  Liechtenstein: 'Europe', 'San Marino': 'Europe', Estonia: 'Europe',
  Latvia: 'Europe', Lithuania: 'Europe', Ukraine: 'Europe', Belarus: 'Europe',
  // North America
  'United States': 'North America', USA: 'North America',
  Canada: 'North America', Mexico: 'North America',
  // Caribbean
  Cuba: 'Caribbean', Jamaica: 'Caribbean', Bahamas: 'Caribbean',
  'Dominican Republic': 'Caribbean', 'Puerto Rico': 'Caribbean',
  Barbados: 'Caribbean', 'Trinidad and Tobago': 'Caribbean',
  'Cayman Islands': 'Caribbean', 'Turks and Caicos Islands': 'Caribbean',
  Aruba: 'Caribbean', Martinique: 'Caribbean', Guadeloupe: 'Caribbean',
  'Saint Lucia': 'Caribbean', Grenada: 'Caribbean', Antigua: 'Caribbean',
  // Central America
  'Costa Rica': 'Central America', Panama: 'Central America',
  Guatemala: 'Central America', Honduras: 'Central America',
  Nicaragua: 'Central America', 'El Salvador': 'Central America',
  Belize: 'Central America',
  // South America
  Brazil: 'South America', Argentina: 'South America', Chile: 'South America',
  Colombia: 'South America', Peru: 'South America', Ecuador: 'South America',
  Bolivia: 'South America', Uruguay: 'South America', Paraguay: 'South America',
  Venezuela: 'South America',
  // Africa
  'South Africa': 'Africa', Egypt: 'Africa', Morocco: 'Africa',
  Kenya: 'Africa', Tanzania: 'Africa', Ethiopia: 'Africa', Ghana: 'Africa',
  Nigeria: 'Africa', Senegal: 'Africa', Tunisia: 'Africa', Rwanda: 'Africa',
  Uganda: 'Africa', Zimbabwe: 'Africa', Zambia: 'Africa', Mozambique: 'Africa',
  // Oceania
  Australia: 'Oceania', 'New Zealand': 'Oceania', Fiji: 'Oceania',
  'Papua New Guinea': 'Oceania', Tahiti: 'Oceania', 'French Polynesia': 'Oceania',
  Maldives: 'Oceania', Seychelles: 'Oceania', Vanuatu: 'Oceania',
};

// Continent → friendly adjective label for name generation
const CONTINENT_LABELS: Record<string, string> = {
  Asia: 'Asian',
  Europe: 'European',
  'North America': 'American',
  'South America': 'South American',
  Africa: 'African',
  Oceania: 'Pacific',
  'Middle East': 'Middle Eastern',
  Caribbean: 'Caribbean',
  'Central America': 'Central American',
};

export function getContinent(country: string): string | undefined {
  return COUNTRY_TO_CONTINENT[country];
}

// Generate trip name suggestions
export function generateTripNameSuggestions(
  destinations: { name: string; country?: string; continent?: string }[],
  selectedVibes: TripVibe[],
  startDate?: Date | null,
  count: number = 4
): string[] {
  const suggestions: string[] = [];

  const getSeason = (date: Date): string => {
    const month = date.getMonth() + 1;
    if (month >= 3 && month <= 5) return 'Spring';
    if (month >= 6 && month <= 8) return 'Summer';
    if (month >= 9 && month <= 11) return 'Fall';
    return 'Winter';
  };

  if (destinations.length === 0) {
    return ['My Trip', 'New Adventure', 'Upcoming Trip', 'The Great Escape'];
  }

  const shortCity = destinations[0].name.split(',')[0].trim();

  // ── Multi-destination logic ──────────────────────────────────────────────
  if (destinations.length > 1) {
    const countries = Array.from(new Set(destinations.map(d => d.country).filter(Boolean))) as string[];
    const continents = Array.from(new Set(destinations.map(d => d.continent).filter(Boolean))) as string[];
    const cities = destinations.map(d => d.name.split(',')[0].trim());

    if (countries.length === 1) {
      // All same country — e.g., Tokyo + Osaka → "Japan Explorer"
      suggestions.push(`${countries[0]} Explorer`, `Discovering ${countries[0]}`);
      if (cities.length === 2) suggestions.push(`${cities[0]} & ${cities[1]}`);
      if (startDate) suggestions.push(`${getSeason(startDate)} in ${countries[0]}`);
    } else if (continents.length === 1 && countries.length >= 2) {
      // Same continent, multiple countries — e.g., Paris + Rome → "European Escape"
      const regionLabel = CONTINENT_LABELS[continents[0]] ?? continents[0];
      suggestions.push(`${regionLabel} Escape`, `${regionLabel} Adventure`);
      if (countries.length === 2) suggestions.push(`${countries[0]} & ${countries[1]}`);
      if (cities.length === 2) suggestions.push(`${cities[0]} & ${cities[1]}`);
    } else {
      // Multiple continents — e.g., Tokyo + Paris → "World Tour"
      suggestions.push('World Tour', 'Global Getaway');
      if (cities.length === 2) suggestions.push(`${cities[0]} & ${cities[1]}`);
      suggestions.push(`${shortCity} & Beyond`);
    }

    // Return early if we already have enough multi-destination suggestions
    const unique = Array.from(new Set(suggestions));
    if (unique.length >= count) return unique.slice(0, count);
  }
  // ────────────────────────────────────────────────────────────────────────

  // Single-city (or fill remaining slots for multi-dest)
  if (selectedVibes.length === 0) {
    suggestions.push(`${shortCity} Getaway`);
    suggestions.push(`The ${shortCity} Trip`);
    if (startDate) {
      suggestions.push(`${getSeason(startDate)} in ${shortCity}`);
    }
    suggestions.push(`${shortCity} Adventures`);
    if (destinations.length > 1) {
      suggestions.push(`${shortCity} & Beyond`);
    }
  } else if (selectedVibes.length === 1) {
    suggestions.push(...generateSingleVibeNames(selectedVibes[0], shortCity, startDate));
  } else {
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

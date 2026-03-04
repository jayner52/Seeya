export function extractCountryFromSecondaryText(secondaryText: string): string | null {
  if (!secondaryText) return null;
  const parts = secondaryText.split(', ');
  return parts[parts.length - 1] || null;
}

const COUNTRY_TO_CONTINENT: Record<string, string> = {
  // Europe
  'Albania': 'Europe', 'Andorra': 'Europe', 'Armenia': 'Europe', 'Austria': 'Europe',
  'Azerbaijan': 'Europe', 'Belarus': 'Europe', 'Belgium': 'Europe', 'Bosnia and Herzegovina': 'Europe',
  'Bulgaria': 'Europe', 'Croatia': 'Europe', 'Cyprus': 'Europe', 'Czech Republic': 'Europe',
  'Czechia': 'Europe', 'Denmark': 'Europe', 'Estonia': 'Europe', 'Finland': 'Europe',
  'France': 'Europe', 'Georgia': 'Europe', 'Germany': 'Europe', 'Greece': 'Europe',
  'Hungary': 'Europe', 'Iceland': 'Europe', 'Ireland': 'Europe', 'Italy': 'Europe',
  'Kosovo': 'Europe', 'Latvia': 'Europe', 'Liechtenstein': 'Europe', 'Lithuania': 'Europe',
  'Luxembourg': 'Europe', 'Malta': 'Europe', 'Moldova': 'Europe', 'Monaco': 'Europe',
  'Montenegro': 'Europe', 'Netherlands': 'Europe', 'North Macedonia': 'Europe', 'Norway': 'Europe',
  'Poland': 'Europe', 'Portugal': 'Europe', 'Romania': 'Europe', 'Russia': 'Europe',
  'San Marino': 'Europe', 'Serbia': 'Europe', 'Slovakia': 'Europe', 'Slovenia': 'Europe',
  'Spain': 'Europe', 'Sweden': 'Europe', 'Switzerland': 'Europe', 'Turkey': 'Europe',
  'Türkiye': 'Europe',
  'Ukraine': 'Europe', 'United Kingdom': 'Europe', 'UK': 'Europe', 'Vatican City': 'Europe',
  'England': 'Europe', 'Scotland': 'Europe', 'Wales': 'Europe', 'Northern Ireland': 'Europe',

  // Asia
  'Afghanistan': 'Asia', 'Bahrain': 'Asia', 'Bangladesh': 'Asia', 'Bhutan': 'Asia',
  'Brunei': 'Asia', 'Cambodia': 'Asia', 'China': 'Asia', 'India': 'Asia',
  'Indonesia': 'Asia', 'Iran': 'Asia', 'Iraq': 'Asia', 'Israel': 'Asia',
  'Japan': 'Asia', 'Jordan': 'Asia', 'Kazakhstan': 'Asia', 'Kuwait': 'Asia',
  'Kyrgyzstan': 'Asia', 'Laos': 'Asia', 'Lebanon': 'Asia', 'Malaysia': 'Asia',
  'Maldives': 'Asia', 'Mongolia': 'Asia', 'Myanmar': 'Asia', 'Nepal': 'Asia',
  'North Korea': 'Asia', 'Oman': 'Asia', 'Pakistan': 'Asia', 'Palestine': 'Asia',
  'Philippines': 'Asia', 'Qatar': 'Asia', 'Saudi Arabia': 'Asia', 'Singapore': 'Asia',
  'South Korea': 'Asia', 'Sri Lanka': 'Asia', 'Syria': 'Asia', 'Taiwan': 'Asia',
  'Tajikistan': 'Asia', 'Thailand': 'Asia', 'Timor-Leste': 'Asia', 'Turkmenistan': 'Asia',
  'United Arab Emirates': 'Asia', 'UAE': 'Asia', 'Uzbekistan': 'Asia', 'Vietnam': 'Asia',
  'Viet Nam': 'Asia', 'Yemen': 'Asia', 'Hong Kong': 'Asia', 'Macau': 'Asia',

  // North America
  'Antigua and Barbuda': 'North America', 'Bahamas': 'North America', 'Barbados': 'North America',
  'Belize': 'North America', 'Canada': 'North America', 'Costa Rica': 'North America',
  'Cuba': 'North America', 'Dominica': 'North America', 'Dominican Republic': 'North America',
  'El Salvador': 'North America', 'Grenada': 'North America', 'Guatemala': 'North America',
  'Haiti': 'North America', 'Honduras': 'North America', 'Jamaica': 'North America',
  'Mexico': 'North America', 'Nicaragua': 'North America', 'Panama': 'North America',
  'Saint Kitts and Nevis': 'North America', 'Saint Lucia': 'North America',
  'Saint Vincent and the Grenadines': 'North America', 'Trinidad and Tobago': 'North America',
  'United States': 'North America', 'USA': 'North America',
  'Puerto Rico': 'North America', 'US Virgin Islands': 'North America',

  // South America
  'Argentina': 'South America', 'Bolivia': 'South America', 'Brazil': 'South America',
  'Chile': 'South America', 'Colombia': 'South America', 'Ecuador': 'South America',
  'Guyana': 'South America', 'Paraguay': 'South America', 'Peru': 'South America',
  'Suriname': 'South America', 'Uruguay': 'South America', 'Venezuela': 'South America',

  // Africa
  'Algeria': 'Africa', 'Angola': 'Africa', 'Benin': 'Africa', 'Botswana': 'Africa',
  'Burkina Faso': 'Africa', 'Burundi': 'Africa', 'Cabo Verde': 'Africa', 'Cape Verde': 'Africa',
  'Cameroon': 'Africa', 'Central African Republic': 'Africa', 'Chad': 'Africa', 'Comoros': 'Africa',
  'Democratic Republic of the Congo': 'Africa', 'DR Congo': 'Africa', 'Djibouti': 'Africa',
  'Egypt': 'Africa', 'Equatorial Guinea': 'Africa', 'Eritrea': 'Africa', 'Eswatini': 'Africa',
  'Ethiopia': 'Africa', 'Gabon': 'Africa', 'Gambia': 'Africa', 'Ghana': 'Africa',
  'Guinea': 'Africa', 'Guinea-Bissau': 'Africa', 'Ivory Coast': 'Africa', "Côte d'Ivoire": 'Africa',
  'Kenya': 'Africa', 'Lesotho': 'Africa', 'Liberia': 'Africa', 'Libya': 'Africa',
  'Madagascar': 'Africa', 'Malawi': 'Africa', 'Mali': 'Africa', 'Mauritania': 'Africa',
  'Mauritius': 'Africa', 'Morocco': 'Africa', 'Mozambique': 'Africa', 'Namibia': 'Africa',
  'Niger': 'Africa', 'Nigeria': 'Africa', 'Republic of the Congo': 'Africa', 'Rwanda': 'Africa',
  'São Tomé and Príncipe': 'Africa', 'Senegal': 'Africa', 'Seychelles': 'Africa',
  'Sierra Leone': 'Africa', 'Somalia': 'Africa', 'South Africa': 'Africa', 'South Sudan': 'Africa',
  'Sudan': 'Africa', 'Tanzania': 'Africa', 'Togo': 'Africa', 'Tunisia': 'Africa',
  'Uganda': 'Africa', 'Zambia': 'Africa', 'Zimbabwe': 'Africa',

  // Oceania
  'Australia': 'Oceania', 'Fiji': 'Oceania', 'Kiribati': 'Oceania', 'Marshall Islands': 'Oceania',
  'Micronesia': 'Oceania', 'Nauru': 'Oceania', 'New Zealand': 'Oceania', 'Palau': 'Oceania',
  'Papua New Guinea': 'Oceania', 'Samoa': 'Oceania', 'Solomon Islands': 'Oceania',
  'Tonga': 'Oceania', 'Tuvalu': 'Oceania', 'Vanuatu': 'Oceania',
  'French Polynesia': 'Oceania', 'New Caledonia': 'Oceania', 'Guam': 'Oceania',

  // Antarctica
  'Antarctica': 'Antarctica',
};

export function getContinent(country: string): string {
  if (!country) return 'Other';
  const normalized = country.trim();
  const direct = COUNTRY_TO_CONTINENT[normalized];
  if (direct) return direct;
  // Case-insensitive fallback
  const lower = normalized.toLowerCase();
  for (const [key, value] of Object.entries(COUNTRY_TO_CONTINENT)) {
    if (key.toLowerCase() === lower) return value;
  }
  return 'Other';
}

/**
 * Determine country and continent from Google Places data or a plain place name.
 * Tries multiple strategies: secondaryText → mainText → all description parts.
 */
export function determineCountryAndContinent(
  mainText?: string,
  secondaryText?: string,
  description?: string,
): { country: string | null; continent: string } {
  // 1. Try extracting country from secondaryText (works for "Paris" → "Île-de-France, France")
  if (secondaryText) {
    const fromSecondary = extractCountryFromSecondaryText(secondaryText);
    if (fromSecondary) {
      const continent = getContinent(fromSecondary);
      if (continent !== 'Other') return { country: fromSecondary, continent };
    }
  }

  // 2. Check if mainText itself is a country/region (works for "Taiwan", "Japan", etc.)
  if (mainText) {
    const continent = getContinent(mainText);
    if (continent !== 'Other') return { country: mainText, continent };
  }

  // 3. Check all parts of description from right to left (country is usually last)
  const text = description || [mainText, secondaryText].filter(Boolean).join(', ');
  if (text) {
    const parts = text.split(', ');
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i].trim();
      const continent = getContinent(part);
      if (continent !== 'Other') return { country: part, continent };
    }
  }

  return { country: null, continent: 'Other' };
}

/**
 * Try to determine country and continent from just a place name string.
 * Used for backfilling existing items and custom place entries.
 */
export function determineContinentFromPlaceName(
  placeName: string,
): { country: string | null; continent: string } {
  return determineCountryAndContinent(undefined, undefined, placeName);
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface ParsedTripBit {
  category: string;
  title: string;
  startDatetime: string | null;
  endDatetime: string | null;
  confidence: number;
  details: Record<string, string | number | boolean>;
}

const SYSTEM_PROMPT = `You are a travel booking data extractor. Analyze the provided screenshot/image or text of a booking confirmation and extract relevant travel information.

Return a JSON object with these fields:
{
    "category": "flight|stay|car|activity|transport|reservation|document|other",
    "title": "Brief descriptive title",
    "startDatetime": "ISO 8601 datetime (YYYY-MM-DDTHH:MM:SS) or null",
    "endDatetime": "ISO 8601 datetime (YYYY-MM-DDTHH:MM:SS) or null",
    "confidence": 0.0 to 1.0,
    "details": {
        // Category-specific fields based on what you can extract
    }
}

Category-specific detail fields:
- flight: airline, flightNumber, departureAirport, arrivalAirport, confirmationNumber, seatAssignments, terminal, gate
- stay: propertyName, propertyType, address, checkInTime, checkOutTime, roomType, confirmationNumber
- car: rentalCompany, vehicleType, pickupLocation, dropoffLocation, confirmationNumber
- activity: venueName, address, duration, meetingPoint, ticketType, confirmationNumber
- transport: transportType, operator, departureStation, arrivalStation, platform, confirmationNumber
- reservation: venueName, venueType, address, reservationTime, partySize, confirmationNumber
- document: documentType, documentNumber, expiryDate, holderName
- other: customType, description, confirmationNumber

CRITICAL DATE EXTRACTION:
1. Search for actual dates in the content - do NOT use today's date
2. For flights, find the DEPARTURE date (not booking date or issue date)
3. Look for patterns like "Depart: May 16, 2025" or similar
4. Extract the YEAR from the content - do NOT assume current year
5. Combine date and time properly (e.g., "May 16, 2025" + "12:10" = "2025-05-16T12:10:00")

Only include fields you can confidently extract. Set confidence based on data clarity.
Return ONLY valid JSON, no additional text or markdown.`;

function parseAIResponse(content: string): ParsedTripBit {
  // Clean up the response - remove markdown code blocks if present
  const cleanedJSON = content
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();

  const parsed = JSON.parse(cleanedJSON);

  return {
    category: parsed.category || 'other',
    title: parsed.title || 'Untitled',
    startDatetime: parsed.startDatetime || null,
    endDatetime: parsed.endDatetime || null,
    confidence: parsed.confidence ?? 0.5,
    details: parsed.details || {},
  };
}

function detectCategoryFromURL(urlString: string): string | null {
  const lowercased = urlString.toLowerCase();

  // Flight URLs
  const flightDomains = ['delta.com', 'united.com', 'aa.com', 'american.com', 'southwest.com',
                        'jetblue.com', 'alaska', 'spirit.com', 'frontier.com', 'british', 'lufthansa',
                        'airfrance', 'emirates', 'qantas', 'aircanada', 'klm.com', 'google.com/flights'];
  if (flightDomains.some(d => lowercased.includes(d))) return 'flight';

  // Hotel/Stay URLs
  const stayDomains = ['marriott.com', 'hilton.com', 'hyatt.com', 'ihg.com', 'airbnb.com',
                       'booking.com', 'hotels.com', 'expedia.com/hotels', 'vrbo.com', 'homeaway',
                       'hostelworld', 'agoda.com', 'trivago.com'];
  if (stayDomains.some(d => lowercased.includes(d))) return 'stay';

  // Car rental URLs
  const carDomains = ['hertz.com', 'enterprise.com', 'avis.com', 'budget.com', 'national.com',
                      'alamo.com', 'turo.com', 'sixt.com', 'dollar.com', 'thrifty.com'];
  if (carDomains.some(d => lowercased.includes(d))) return 'car';

  // Activity URLs
  const activityDomains = ['viator.com', 'getyourguide.com', 'tripadvisor.com/attraction',
                           'klook.com', 'civitatis', 'musement.com', 'expedia.com/things-to-do'];
  if (activityDomains.some(d => lowercased.includes(d))) return 'activity';

  // Transport URLs
  const transportDomains = ['amtrak.com', 'trainline.com', 'eurostar.com', 'greyhound.com',
                            'flixbus.com', 'uber.com', 'lyft.com', 'rome2rio'];
  if (transportDomains.some(d => lowercased.includes(d))) return 'transport';

  // Reservation URLs
  const reservationDomains = ['opentable.com', 'resy.com', 'yelp.com/reservations', 'tock.com',
                              'sevenrooms.com'];
  if (reservationDomains.some(d => lowercased.includes(d))) return 'reservation';

  return null;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI parsing is not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { type, content, imageBase64 } = body;

    if (!type || (!content && !imageBase64)) {
      return NextResponse.json(
        { error: 'Missing required fields: type and (content or imageBase64)' },
        { status: 400 }
      );
    }

    let messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }>;

    if (type === 'image' && imageBase64) {
      // Image parsing with vision model
      messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: imageBase64.startsWith('data:')
                  ? imageBase64
                  : `data:image/jpeg;base64,${imageBase64}`,
              },
            },
            {
              type: 'text',
              text: 'Extract the booking information from this image.',
            },
          ],
        },
      ];
    } else if (type === 'text' && content) {
      // Text parsing
      messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Extract travel booking information from this text:\n\n---\n${content}\n---\n\nReturn the extracted data as JSON.`,
        },
      ];
    } else if (type === 'url' && content) {
      // URL detection with optional AI enhancement
      const detectedCategory = detectCategoryFromURL(content);

      messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Analyze this booking/travel URL and extract any information from the URL structure:\n\nURL: ${content}\n\nReturn the extracted data as JSON.`,
        },
      ];

      // If we detected category from URL, we might not need AI
      if (detectedCategory) {
        return NextResponse.json({
          category: detectedCategory,
          title: `New ${detectedCategory.charAt(0).toUpperCase() + detectedCategory.slice(1)}`,
          startDatetime: null,
          endDatetime: null,
          confidence: 0.7,
          details: { url: content },
        });
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid type. Must be "image", "text", or "url"' },
        { status: 400 }
      );
    }

    // Call OpenRouter API
    const model = type === 'image' ? 'anthropic/claude-3.5-sonnet' : 'anthropic/claude-3.5-haiku';

    const openRouterResponse = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://seeya.app',
        'X-Title': 'Seeya Travel App',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 1000,
        temperature: 0.1,
      }),
    });

    if (!openRouterResponse.ok) {
      const errorData = await openRouterResponse.text();
      console.error('OpenRouter API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to parse booking information' },
        { status: 502 }
      );
    }

    const aiResponse = await openRouterResponse.json();
    const aiContent = aiResponse.choices?.[0]?.message?.content;

    if (!aiContent) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 502 }
      );
    }

    const parsed = parseAIResponse(aiContent);
    return NextResponse.json(parsed);

  } catch (error) {
    console.error('Parse booking API error:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables');
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);

/**
 * Validate an invite code and return invite details
 */
export async function validateInviteCode(code) {
  try {
    const { data, error } = await supabase
      .from('trip_invite_links')
      .select(`
        id,
        trip_id,
        code,
        expires_at,
        location_ids,
        trips:trip_id (
          id,
          title,
          destination,
          start_date,
          end_date
        )
      `)
      .eq('code', code)
      .single();

    if (error || !data) {
      return { valid: false, error: 'Invite not found' };
    }

    // Check if expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return { valid: false, error: 'Invite has expired', expired: true };
    }

    return {
      valid: true,
      invite: data,
      trip: data.trips,
    };
  } catch (err) {
    console.error('Error validating invite:', err);
    return { valid: false, error: 'Failed to validate invite' };
  }
}

-- Function to get suggested friends based on mutual connections and shared destinations
CREATE OR REPLACE FUNCTION public.get_suggested_friends(_user_id uuid)
RETURNS TABLE(
  user_id uuid,
  username text,
  full_name text,
  avatar_url text,
  suggestion_reason text,
  mutual_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH -- Get tripmates who aren't friends yet
  tripmate_suggestions AS (
    SELECT 
      t.user_id,
      'tripmate' as reason,
      0 as mutual
    FROM get_tripmates(_user_id) t
    WHERE NOT are_friends(_user_id, t.user_id)
  ),
  -- Get friends of friends (mutual friends)
  mutual_friend_suggestions AS (
    SELECT DISTINCT
      CASE 
        WHEN f2.requester_id = f.addressee_id OR f2.requester_id = f.requester_id 
        THEN f2.addressee_id 
        ELSE f2.requester_id 
      END as potential_friend_id,
      COUNT(*) as mutual_count
    FROM friendships f
    JOIN friendships f2 ON (
      f2.status = 'accepted' AND
      (f2.requester_id IN (
        CASE WHEN f.requester_id = _user_id THEN f.addressee_id ELSE f.requester_id END
      ) OR f2.addressee_id IN (
        CASE WHEN f.requester_id = _user_id THEN f.addressee_id ELSE f.requester_id END
      ))
    )
    WHERE f.status = 'accepted'
      AND (_user_id IN (f.requester_id, f.addressee_id))
      AND CASE 
        WHEN f2.requester_id = f.addressee_id OR f2.requester_id = f.requester_id 
        THEN f2.addressee_id 
        ELSE f2.requester_id 
      END != _user_id
      AND NOT are_friends(_user_id, 
        CASE 
          WHEN f2.requester_id = f.addressee_id OR f2.requester_id = f.requester_id 
          THEN f2.addressee_id 
          ELSE f2.requester_id 
        END
      )
    GROUP BY potential_friend_id
  )
  -- Combine and return with profile info
  SELECT 
    p.id as user_id,
    p.username,
    p.full_name,
    p.avatar_url,
    CASE 
      WHEN ts.user_id IS NOT NULL THEN 'You''ve traveled together'
      WHEN mf.potential_friend_id IS NOT NULL THEN mf.mutual_count || ' mutual pal' || CASE WHEN mf.mutual_count > 1 THEN 's' ELSE '' END
      ELSE 'Suggested'
    END as suggestion_reason,
    COALESCE(mf.mutual_count, 0)::integer as mutual_count
  FROM profiles p
  LEFT JOIN tripmate_suggestions ts ON ts.user_id = p.id
  LEFT JOIN mutual_friend_suggestions mf ON mf.potential_friend_id = p.id
  WHERE (ts.user_id IS NOT NULL OR mf.potential_friend_id IS NOT NULL)
    AND p.id != _user_id
    -- Exclude pending requests
    AND NOT EXISTS (
      SELECT 1 FROM friendships f 
      WHERE f.status = 'pending' 
        AND ((f.requester_id = _user_id AND f.addressee_id = p.id)
          OR (f.addressee_id = _user_id AND f.requester_id = p.id))
    )
  ORDER BY 
    CASE WHEN ts.user_id IS NOT NULL THEN 0 ELSE 1 END,
    COALESCE(mf.mutual_count, 0) DESC
  LIMIT 20;
END;
$$;
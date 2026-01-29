-- Fix Security Issue: Escape SQL wildcard characters in user search function
-- This prevents users from using % or _ wildcards to bypass minimum length requirements
-- or cause unexpected matching behavior

CREATE OR REPLACE FUNCTION public.search_users_for_friends(_query text)
 RETURNS TABLE(id uuid, username text, full_name text, avatar_url text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  escaped_query TEXT;
BEGIN
  IF _query IS NULL OR LENGTH(_query) < 3 THEN
    RAISE EXCEPTION 'Search query must be at least 3 characters';
  END IF;
  
  -- Escape SQL wildcards to prevent injection
  escaped_query := REPLACE(REPLACE(_query, '%', '\%'), '_', '\_');
  
  RETURN QUERY
  SELECT p.id, p.username, p.full_name, p.avatar_url
  FROM public.profiles p
  WHERE (p.username ILIKE escaped_query || '%' ESCAPE '\'
         OR p.full_name ILIKE '%' || escaped_query || '%' ESCAPE '\')
    AND p.id != auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE (f.requester_id = auth.uid() AND f.addressee_id = p.id)
         OR (f.addressee_id = auth.uid() AND f.requester_id = p.id)
    )
  LIMIT 20;
END;
$function$;
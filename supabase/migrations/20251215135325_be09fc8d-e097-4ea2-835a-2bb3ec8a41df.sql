-- Update handle_new_user to handle OAuth signups (no username in metadata)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  generated_username text;
BEGIN
  -- Try to get username from metadata, or generate from email, or create a random one
  generated_username := COALESCE(
    new.raw_user_meta_data ->> 'username',
    -- For OAuth users, try to create username from name
    REGEXP_REPLACE(
      LOWER(COALESCE(
        new.raw_user_meta_data ->> 'name',
        new.raw_user_meta_data ->> 'full_name',
        split_part(new.email, '@', 1)
      )),
      '[^a-z0-9._]', '', 'g'
    )
  );
  
  -- Ensure username is not empty and meets minimum length
  IF LENGTH(generated_username) < 3 THEN
    generated_username := 'user_' || SUBSTRING(new.id::text, 1, 8);
  END IF;
  
  -- Handle duplicate usernames by appending random suffix
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = generated_username) LOOP
    generated_username := generated_username || '_' || SUBSTRING(gen_random_uuid()::text, 1, 4);
  END LOOP;
  
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    new.id,
    generated_username,
    COALESCE(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  
  RETURN new;
END;
$$;
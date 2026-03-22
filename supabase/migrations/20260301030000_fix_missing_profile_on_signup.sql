-- Fix: new email signups can end up with no profile row if handle_new_user
-- fails (e.g. username uniqueness collision). This causes a 406 on every
-- subsequent profiles fetch and a 500 on invite accept.
--
-- Three changes:
--   1. Harden handle_new_user to retry with a numeric suffix on collision.
--   2. Add ensure_profile_exists() SECURITY DEFINER RPC that the web route
--      can call as a safety net before touching trip_participants.
--   3. Backfill any auth users who currently have no profile row.

-- ── 1. Harden handle_new_user ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  attempt INT := 0;
BEGIN
  base_username := COALESCE(
    NEW.raw_user_meta_data ->> 'username',
    split_part(NEW.email, '@', 1),
    'user'
  );
  final_username := base_username;

  LOOP
    BEGIN
      INSERT INTO public.profiles (id, username, full_name, avatar_url)
      VALUES (
        NEW.id,
        final_username,
        COALESCE(
          NEW.raw_user_meta_data ->> 'full_name',
          NEW.raw_user_meta_data ->> 'name'
        ),
        NEW.raw_user_meta_data ->> 'avatar_url'
      );
      EXIT; -- success
    EXCEPTION
      WHEN unique_violation THEN
        attempt := attempt + 1;
        IF attempt > 10 THEN EXIT; END IF; -- give up after 10 tries
        final_username := base_username || attempt::TEXT;
      WHEN OTHERS THEN
        EXIT; -- unexpected error — do not block signup
    END;
  END LOOP;

  RETURN NEW;
END;
$$;

-- ── 2. ensure_profile_exists() — callable by the authed user ─────────────────
-- If the calling user already has a profile this is a no-op.
-- If not, it reads auth.users and creates one.
CREATE OR REPLACE FUNCTION public.ensure_profile_exists()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid         UUID := auth.uid();
  user_email  TEXT;
  user_meta   JSONB;
  base_un     TEXT;
  final_un    TEXT;
  attempt     INT := 0;
BEGIN
  -- Fast path: profile already exists
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = uid) THEN
    RETURN;
  END IF;

  SELECT email, raw_user_meta_data
  INTO user_email, user_meta
  FROM auth.users
  WHERE id = uid;

  base_un  := COALESCE(
    user_meta ->> 'username',
    user_meta ->> 'preferred_username',
    split_part(user_email, '@', 1),
    'user'
  );
  final_un := base_un;

  LOOP
    BEGIN
      INSERT INTO public.profiles (id, username, full_name, avatar_url)
      VALUES (
        uid,
        final_un,
        COALESCE(user_meta ->> 'full_name', user_meta ->> 'name'),
        user_meta ->> 'avatar_url'
      );
      EXIT;
    EXCEPTION
      WHEN unique_violation THEN
        attempt := attempt + 1;
        IF attempt > 10 THEN EXIT; END IF;
        final_un := base_un || attempt::TEXT;
      WHEN OTHERS THEN
        EXIT;
    END;
  END LOOP;
END;
$$;

-- ── 3. Backfill auth users who have no profile yet ───────────────────────────
DO $$
DECLARE
  rec      RECORD;
  base_un  TEXT;
  final_un TEXT;
  attempt  INT;
BEGIN
  FOR rec IN
    SELECT u.id, u.email, u.raw_user_meta_data
    FROM auth.users u
    WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
  LOOP
    base_un := COALESCE(
      rec.raw_user_meta_data ->> 'username',
      split_part(rec.email, '@', 1),
      'user'
    );
    -- Append a short id fragment to minimise collision risk in the batch
    final_un := base_un || '_' || substr(replace(rec.id::TEXT, '-', ''), 1, 6);
    attempt  := 0;

    LOOP
      BEGIN
        INSERT INTO public.profiles (id, username, full_name, avatar_url)
        VALUES (
          rec.id,
          final_un,
          COALESCE(
            rec.raw_user_meta_data ->> 'full_name',
            rec.raw_user_meta_data ->> 'name'
          ),
          rec.raw_user_meta_data ->> 'avatar_url'
        );
        EXIT;
      EXCEPTION
        WHEN unique_violation THEN
          attempt  := attempt + 1;
          IF attempt > 10 THEN EXIT; END IF;
          final_un := base_un || '_' || substr(replace(rec.id::TEXT, '-', ''), 1, 6) || attempt::TEXT;
        WHEN OTHERS THEN
          EXIT;
      END;
    END LOOP;
  END LOOP;
END;
$$;

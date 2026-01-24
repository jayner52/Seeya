-- Drop the restrictive policies and create a permissive one for profile search
DROP POLICY IF EXISTS "Users can view profiles of friends" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Allow authenticated users to view all profiles (needed for friend search/requests)
CREATE POLICY "Authenticated users can view profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);
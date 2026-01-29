import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TripType {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  description: string | null;
}

export function useTripTypes() {
  return useQuery({
    queryKey: ['tripTypes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trip_types')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as TripType[];
    },
  });
}

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useUserRole = (userId: string | undefined) => {
  const [role, setRole] = useState<'player' | 'organizer' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    fetchUserRole();
  }, [userId]);

  const fetchUserRole = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      setRole(data?.role || null);
    } catch (error) {
      console.error('Error fetching user role:', error);
    } finally {
      setLoading(false);
    }
  };

  return { role, loading, refetch: fetchUserRole };
};

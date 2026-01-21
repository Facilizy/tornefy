import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  related_id: string | null;
  read: boolean;
  created_at: string;
}

export const useNotifications = (userId: string | undefined) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    if (!userId) {
      if (mountedRef.current) setLoading(false);
      return;
    }

    fetchNotifications();
    channelRef.current = subscribeToNotifications() ?? null;

    return () => {
      mountedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId]);

  const fetchNotifications = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      if (!mountedRef.current) return;
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const subscribeToNotifications = () => {
    if (!userId) return;

    // IMPORTANT: channel names must be unique per component instance.
    // Re-using the same name in multiple places (Header + MainLayout) can cause
    // unexpected teardown behavior when one instance unmounts.
    const channelName = `notifications:${userId}:${Date.now()}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          if (!mountedRef.current) return;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);

          // Show toast notification
          toast(newNotification.title || 'Notificação', {
            description: newNotification.message || undefined,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const updatedNotification = payload.new as Notification;
          if (!mountedRef.current) return;
          setNotifications(prev =>
            prev.map(n => (n.id === updatedNotification.id ? updatedNotification : n))
          );
          setUnreadCount(prev => (updatedNotification.read ? Math.max(0, prev - 1) : prev));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const deletedId = payload.old.id;
          if (!mountedRef.current) return;
          setNotifications(prev => prev.filter(n => n.id !== deletedId));
          if (!payload.old.read) setUnreadCount(prev => Math.max(0, prev - 1));
        }
      )
      .subscribe();

    return channel;
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Erro', {
        description: 'Não foi possível marcar a notificação como lida',
      });
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;

      toast.success('Sucesso', {
        description: 'Todas as notificações foram marcadas como lidas',
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Erro', {
        description: 'Não foi possível marcar as notificações como lidas',
      });
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      toast.success('Sucesso', {
        description: 'Notificação excluída',
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Erro', {
        description: 'Não foi possível excluir a notificação',
      });
    }
  };

  const clearRead = async () => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId)
        .eq('read', true);

      if (error) throw error;

      toast.success('Sucesso', {
        description: 'Notificações lidas foram removidas',
      });

      // Keep UI in sync immediately
      if (!mountedRef.current) return;
      setNotifications((prev) => prev.filter((n) => !n.read));
    } catch (error) {
      console.error('Error clearing read notifications:', error);
      toast.error('Erro', {
        description: 'Não foi possível limpar as notificações lidas',
      });
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearRead,
    refetch: fetchNotifications,
  };
};
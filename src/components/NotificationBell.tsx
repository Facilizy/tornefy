import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { NotificationList } from './NotificationList';
import { useNotifications } from '@/hooks/useNotifications';
import { Separator } from '@/components/ui/separator';

interface NotificationBellProps {
  userId: string | undefined;
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    // clearRead is used on the /notificacoes page
  } = useNotifications(userId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notificações"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex flex-col">
          <NotificationList
            notifications={notifications}
            loading={loading}
            onMarkAsRead={markAsRead}
            onMarkAllAsRead={markAllAsRead}
            onDelete={deleteNotification}
            onClose={() => setOpen(false)}
          />
          <Separator />
          <div className="p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                setOpen(false);
                navigate('/notificacoes');
              }}
            >
              Vá para página de notificações
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
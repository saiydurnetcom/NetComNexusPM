import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/hooks/useNotifications';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Separator } from '@/components/ui/separator';

export function NotificationBell() {
  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.relatedTaskId) {
      navigate(`/tasks/${notification.relatedTaskId}`);
    } else if (notification.relatedProjectId) {
      navigate(`/projects/${notification.relatedProjectId}`);
    }

    setIsOpen(false);
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      toast({
        title: 'Success',
        description: 'All notifications marked as read',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to mark all as read',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    try {
      await deleteNotification(notificationId);
      toast({
        title: 'Success',
        description: 'Notification deleted',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete notification',
        variant: 'destructive',
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    const normalized = typeof type === 'string' ? type.toUpperCase() : '';

    switch (normalized) {
      case 'TASK_ASSIGNED':
      case 'TASK_DUE':
      case 'TASK_OVERDUE':
        return '📋';
      case 'COMMENT':
      case 'MENTION':
        return '💬';
      case 'MILESTONE':
        return '🎯';
      case 'DEPENDENCY_BLOCKED':
        return '🔗';
      default:
        return '🔔';
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
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
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs"
            >
              Mark all as read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                        <h4 className={`text-sm font-medium ${!notification.read ? 'font-semibold' : ''}`}>
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <div className="h-2 w-2 rounded-full bg-blue-600 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2">{notification.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {format(new Date(notification.createdAt), 'MMM dd, h:mm a')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={(e) => handleDelete(e, notification.id)}
                    >
                      <span className="text-xs">×</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}


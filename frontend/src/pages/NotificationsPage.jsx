import React, { useEffect, useState } from 'react';
import MainLayout from '../components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  Settings,
  Heart,
  MessageCircle,
  Users,
  CheckCircle,
  UserPlus,
  Loader2
} from 'lucide-react';

const NotificationsPage = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
    // Обновляем каждые 10 секунд
    const interval = setInterval(() => {
      fetchNotifications();
      fetchUnreadCount();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data || []);
    } catch (e) {
      console.error('Error fetching notifications:', e);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data.count || 0);
    } catch (e) {
      console.error('Error fetching unread count:', e);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await api.post(`/notifications/${notificationId}/read`);
      await fetchNotifications();
      await fetchUnreadCount();
    } catch (e) {
      console.error('Error marking notification as read:', e);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/read-all');
      await fetchNotifications();
      await fetchUnreadCount();
    } catch (e) {
      console.error('Error marking all as read:', e);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'friend_request':
      case 'friend_accepted':
        return <UserPlus className="w-5 h-5 text-blue-500" />;
      case 'post_like':
        return <Heart className="w-5 h-5 text-red-500" />;
      case 'comment':
        return <MessageCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${minutes} мин назад`;
    if (hours < 24) return `${hours} ч назад`;
    if (days < 7) return `${days} дн назад`;
    return date.toLocaleDateString('ru-RU');
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    
    // Навигация в зависимости от типа
    if (notification.type === 'friend_request' || notification.type === 'friend_accepted') {
      navigate('/friends');
    } else if (notification.type === 'post_like' && notification.target_id) {
      // Можно перейти к посту
      navigate('/');
    }
  };

  const filteredNotifications = notifications.filter(notif => {
    if (activeTab === 'all') return true;
    if (activeTab === 'friends') {
      return notif.type === 'friend_request' || notif.type === 'friend_accepted';
    }
    if (activeTab === 'likes') {
      return notif.type === 'post_like';
    }
    return true;
  });

  const friendRequests = notifications.filter(n => n.type === 'friend_request');
  const likes = notifications.filter(n => n.type === 'post_like');

  return (
    <MainLayout>
      <div className="w-full min-w-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 animate-slide-down">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate">Уведомления</h1>
            {unreadCount > 0 && (
              <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5 shrink-0">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead} className="text-xs sm:text-sm">
                <CheckCircle className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">Отметить все как прочитанные</span>
                <span className="sm:hidden">Прочитано</span>
              </Button>
            )}
            <Button variant="outline" size="sm" className="animate-scale-hover" onClick={() => navigate('/settings')}>
              <Settings className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Настройки</span>
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex w-full overflow-x-auto flex-nowrap gap-1 p-1 mb-4 sm:mb-6 min-h-[44px] sm:grid sm:grid-cols-4 sm:max-w-md">
            <TabsTrigger value="all" className="shrink-0 text-xs sm:text-sm">
              Все {unreadCount > 0 && `(${unreadCount})`}
            </TabsTrigger>
            <TabsTrigger value="friends" className="shrink-0 text-xs sm:text-sm">
              Друзья {friendRequests.length > 0 && `(${friendRequests.length})`}
            </TabsTrigger>
            <TabsTrigger value="likes" className="shrink-0 text-xs sm:text-sm">
              Активность {likes.length > 0 && `(${likes.length})`}
            </TabsTrigger>
            <TabsTrigger value="other" className="shrink-0 text-xs sm:text-sm">Другое</TabsTrigger>
          </TabsList>

          {/* All Notifications */}
          <TabsContent value="all">
            {loading ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                </CardContent>
              </Card>
            ) : filteredNotifications.length === 0 ? (
              <Card className="animate-fade-in">
                <CardContent className="text-center py-16">
                  <div className="animate-bounce-gentle mb-6">
                    <Bell className="w-20 h-20 text-muted-foreground mx-auto" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-4">Нет уведомлений</h3>
                  <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                    Все ваши уведомления будут отображаться здесь. 
                    Начните активность, чтобы получать уведомления от друзей!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredNotifications.map((notif) => (
                  <Card
                    key={notif.id}
                    className={`cursor-pointer hover:bg-muted/50 transition-colors ${
                      !notif.is_read ? 'border-l-4 border-l-primary' : ''
                    }`}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                        <Avatar className="w-9 h-9 sm:w-10 sm:h-10 shrink-0">
                          <AvatarImage src={notif.actor_avatar} alt={notif.actor_username} />
                          <AvatarFallback>{getNotificationIcon(notif.type)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <p className="font-medium text-sm truncate">
                              {notif.actor_username || 'Пользователь'}
                            </p>
                            <span className="text-xs sm:text-sm text-muted-foreground break-words">
                              {notif.content || 'выполнил(а) действие'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatTime(notif.created_at)}
                          </p>
                        </div>
                        {!notif.is_read && (
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Friend Requests */}
          <TabsContent value="friends">
            {friendRequests.length === 0 ? (
              <Card className="animate-fade-in">
                <CardContent className="text-center py-12">
                  <div className="animate-pulse-gentle mb-6">
                    <Users className="w-16 h-16 text-muted-foreground mx-auto" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Нет заявок в друзья</h3>
                  <p className="text-muted-foreground">
                    Новые заявки в друзья появятся в этом разделе
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {friendRequests.map((notif) => (
                  <Card
                    key={notif.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarImage src={notif.actor_avatar} alt={notif.actor_username} />
                            <AvatarFallback>{(notif.actor_username || 'U')[0].toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{notif.actor_username}</p>
                            <p className="text-sm text-muted-foreground">{notif.content}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              api.post('/friends/accept', { user_id: notif.actor_id }).then(() => {
                                fetchNotifications();
                                fetchUnreadCount();
                              });
                            }}
                          >
                            Принять
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Likes and Comments */}
          <TabsContent value="likes">
            {likes.length === 0 ? (
              <Card className="animate-fade-in">
                <CardContent className="text-center py-12">
                  <div className="animate-bounce-gentle mb-6">
                    <Heart className="w-16 h-16 text-muted-foreground mx-auto" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Нет активности</h3>
                  <p className="text-muted-foreground">
                    Лайки и комментарии к вашим постам будут здесь
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {likes.map((notif) => (
                  <Card
                    key={notif.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={notif.actor_avatar} alt={notif.actor_username} />
                          <AvatarFallback>
                            <Heart className="w-5 h-5 text-red-500" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{notif.actor_username}</p>
                          <p className="text-sm text-muted-foreground">{notif.content}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatTime(notif.created_at)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Other Notifications */}
          <TabsContent value="other">
            <Card className="animate-fade-in">
              <CardContent className="text-center py-12">
                <div className="animate-pulse-gentle mb-6">
                  <CheckCircle className="w-16 h-16 text-muted-foreground mx-auto" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Все просмотрено!</h3>
                <p className="text-muted-foreground">
                  Другие уведомления будут отображаться здесь
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default NotificationsPage;

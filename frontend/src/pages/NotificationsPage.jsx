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
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6 animate-slide-down">
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold">Уведомления</h1>
            {unreadCount > 0 && (
              <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-1">
                {unreadCount}
              </span>
            )}
          </div>
          
          <div className="flex space-x-2">
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                Отметить все как прочитанные
              </Button>
            )}
            <Button variant="outline" size="sm" className="animate-scale-hover">
              <Settings className="w-4 h-4 mr-2" />
              Настройки
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 max-w-md mb-6">
            <TabsTrigger value="all">
              Все {unreadCount > 0 && `(${unreadCount})`}
            </TabsTrigger>
            <TabsTrigger value="friends">
              Друзья {friendRequests.length > 0 && `(${friendRequests.length})`}
            </TabsTrigger>
            <TabsTrigger value="likes">
              Активность {likes.length > 0 && `(${likes.length})`}
            </TabsTrigger>
            <TabsTrigger value="other">Другое</TabsTrigger>
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
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={notif.actor_avatar} alt={notif.actor_username} />
                          <AvatarFallback>{getNotificationIcon(notif.type)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-sm">
                              {notif.actor_username || 'Пользователь'}
                            </p>
                            <span className="text-sm text-muted-foreground">
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

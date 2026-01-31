import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import api from '../api/axios';
import { useUser } from '../context/UserContext';
import { UserPlus, MessageCircle, Loader2, MapPin, Calendar, Users, Phone } from 'lucide-react';

const ACCENT_STYLES = {
  blue: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  green: 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)',
  purple: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
  teal: 'linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)',
};

const UserProfile = ({ username: usernameProp }) => {
  const { id: idParam } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFriend, setIsFriend] = useState(false);
  const [friendRequestSent, setFriendRequestSent] = useState(false);
  const navigate = useNavigate();
  const { user: currentUser } = useUser();

  const byUsername = !!usernameProp;
  const identifier = byUsername ? usernameProp : idParam;

  useEffect(() => {
    fetchUser();
  }, [identifier, byUsername]);

  useEffect(() => {
    if (!user?.id) return;
    checkFriendship();
  }, [user?.id]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const url = byUsername
        ? `/users/username/${encodeURIComponent(identifier)}`
        : `/users/${identifier}`;
      const res = await api.get(url);
      setUser(res.data);
    } catch (e) {
      console.error('Error fetching user:', e);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const checkFriendship = async () => {
    if (!user?.id) return;
    try {
      const friendsRes = await api.get('/friends');
      const friends = friendsRes.data || [];
      setIsFriend(friends.some(f => f.id === user.id));
      const requestsRes = await api.get('/friends/requests');
      const requests = requestsRes.data || { incoming: [], outgoing: [] };
      setFriendRequestSent(requests.outgoing.some(r => r.user_id === user.id));
    } catch (e) {
      console.error('Error checking friendship:', e);
    }
  };

  const addFriend = async () => {
    if (!user?.id) return;
    try {
      await api.post('/friends/request', { user_id: user.id });
      setFriendRequestSent(true);
      alert('Заявка отправлена');
    } catch (e) {
      const errorMsg = e.response?.data?.detail || 'Не удалось отправить заявку';
      alert(errorMsg);
    }
  };

  const sendMessage = async () => {
    if (!user?.id) return;
    try {
      await api.post('/messages/send', { to_user_id: user.id, content: 'Привет!' });
      navigate('/messages');
    } catch (e) {
      const errorMsg = e.response?.data?.detail || 'Не удалось начать диалог';
      alert(errorMsg);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-4" />
              <p className="text-muted-foreground">Загрузка профиля...</p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">Пользователь не найден</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate('/find-friends')}>
                Найти друзей
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const isOwnProfile = currentUser?.id === user?.id;
  const coverStyle = user?.cover_photo
    ? { backgroundImage: `url(${user.cover_photo})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: (user?.profile_accent && ACCENT_STYLES[user.profile_accent]) || ACCENT_STYLES.blue, backgroundSize: 'cover', backgroundPosition: 'center' };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6">
          <div className="relative">
            {/* Cover Photo */}
            <div
              className="h-64 rounded-t-lg overflow-hidden relative"
              style={coverStyle}
            >
              <div className="absolute inset-0 bg-black/20"></div>
            </div>

            {/* Profile Picture */}
            <div className="absolute -bottom-12 left-6">
              <Avatar className="w-28 h-28 border-4 border-background shadow-xl">
                <AvatarImage src={user.avatar_url} alt={user.username} />
                <AvatarFallback className="text-3xl bg-gradient-to-br from-blue-400 to-purple-500 text-white">
                  {(user.username || 'U')[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          <CardContent className="pt-16 pb-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-2xl font-bold">{user.username}</h1>
                </div>
                <p className="text-muted-foreground mb-4">{user.email}</p>

                <div className="space-y-3 text-sm mb-4">
                  {user.phone && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Телефон</p>
                      <p className="text-foreground flex items-center gap-2">
                        <Phone className="w-4 h-4 shrink-0" />
                        {user.phone}
                      </p>
                    </div>
                  )}
                  {user.bio && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">О себе</p>
                      <p className="text-foreground">{user.bio}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Имя пользователя</p>
                    <p className="text-foreground">@{user.username}</p>
                  </div>
                  {user.birth_date && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">День рождения</p>
                      <p className="text-foreground flex items-center gap-2">
                        <Calendar className="w-4 h-4 shrink-0" />
                        {user.birth_date}
                      </p>
                    </div>
                  )}
                  {user.work_hours && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Часы работы</p>
                      <p className="text-foreground">{user.work_hours}</p>
                    </div>
                  )}
                  {user.location && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Город</p>
                      <p className="text-foreground flex items-center gap-2">
                        <MapPin className="w-4 h-4 shrink-0" />
                        {user.location}
                      </p>
                    </div>
                  )}
                </div>

                {user.community_name && (
                  <div className="rounded-lg border border-border p-4 bg-muted/30 mb-4">
                    <p className="font-medium text-foreground">{user.community_name}</p>
                    {user.community_description && (
                      <p className="text-sm text-muted-foreground mt-1">{user.community_description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">Канал • сообщество</p>
                  </div>
                )}
              </div>

              {!isOwnProfile && (
                <div className="flex space-x-2">
                  {isFriend ? (
                    <>
                      <Button variant="outline" onClick={sendMessage}>
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Сообщение
                      </Button>
                    </>
                  ) : friendRequestSent ? (
                    <Button variant="outline" disabled>
                      Заявка отправлена
                    </Button>
                  ) : (
                    <Button onClick={addFriend}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Добавить в друзья
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default UserProfile;



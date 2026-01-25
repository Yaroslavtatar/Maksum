import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import api from '../api/axios';
import { useUser } from '../context/UserContext';
import { UserPlus, MessageCircle, Loader2, MapPin, Calendar, Users } from 'lucide-react';

const UserProfile = () => {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFriend, setIsFriend] = useState(false);
  const [friendRequestSent, setFriendRequestSent] = useState(false);
  const navigate = useNavigate();
  const { user: currentUser } = useUser();

  useEffect(() => {
    fetchUser();
    checkFriendship();
  }, [id]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/users/${id}`);
      setUser(res.data);
    } catch (e) {
      console.error('Error fetching user:', e);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const checkFriendship = async () => {
    try {
      const friendsRes = await api.get('/friends');
      const friends = friendsRes.data || [];
      setIsFriend(friends.some(f => f.id === Number(id)));
      
      const requestsRes = await api.get('/friends/requests');
      const requests = requestsRes.data || { incoming: [], outgoing: [] };
      setFriendRequestSent(requests.outgoing.some(r => r.user_id === Number(id)));
    } catch (e) {
      console.error('Error checking friendship:', e);
    }
  };

  const addFriend = async () => {
    try {
      await api.post('/friends/request', { user_id: Number(id) });
      setFriendRequestSent(true);
      alert('Заявка отправлена');
    } catch (e) {
      const errorMsg = e.response?.data?.detail || 'Не удалось отправить заявку';
      alert(errorMsg);
    }
  };

  const sendMessage = async () => {
    try {
      await api.post('/messages/send', { to_user_id: Number(id), content: 'Привет!' });
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

  const isOwnProfile = currentUser?.id === Number(id);

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6">
          <div className="relative">
            {/* Cover Photo */}
            <div 
              className="h-64 rounded-t-lg overflow-hidden relative"
              style={{
                backgroundImage: user?.cover_photo 
                  ? `url(${user.cover_photo})` 
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
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
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    В сети
                  </Badge>
                </div>
                <p className="text-muted-foreground mb-4">{user.email}</p>
                
                {user.bio && (
                  <p className="text-foreground mb-4">{user.bio}</p>
                )}
                
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {user.location && (
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      {user.location}
                    </div>
                  )}
                  {user.birth_date && (
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {user.birth_date}
                    </div>
                  )}
                </div>
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



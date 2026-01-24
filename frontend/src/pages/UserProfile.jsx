import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import axios from 'axios';
import { UserPlus, MessageCircle } from 'lucide-react';

const UserProfile = () => {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await axios.get(`/api/users/${id}`);
        if (mounted) setUser(res.data);
      } catch (e) {
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  const addFriend = async () => {
    try {
      await axios.post('/api/friends/request', { user_id: Number(id) });
      alert('Заявка отправлена');
    } catch (e) {
      alert('Не удалось отправить заявку');
    }
  };

  const sendMessage = async () => {
    try {
      await axios.post('/api/messages/send', { to_user_id: Number(id), content: '👋' });
      navigate('/messages');
    } catch (e) {
      alert('Не удалось начать диалог');
    }
  };

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto">
        {loading && (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Загрузка...</CardContent></Card>
        )}
        {!loading && !user && (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Пользователь не найден</CardContent></Card>
        )}
        {!loading && user && (
          <Card>
            <CardHeader>
              <CardTitle>Профиль пользователя</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={user.avatar_url || undefined} alt={user.username} />
                <AvatarFallback>{(user.username || 'U')[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-xl font-semibold truncate">{user.username}</div>
                <div className="text-sm text-muted-foreground truncate">{user.email}</div>
              </div>
              <div className="flex gap-2">
                <Button onClick={addFriend}><UserPlus className="w-4 h-4 mr-2" />Добавить</Button>
                <Button variant="outline" onClick={sendMessage}><MessageCircle className="w-4 h-4 mr-2" />Написать</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default UserProfile;



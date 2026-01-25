import React, { useEffect, useState } from 'react';
import MainLayout from '../components/Layout/MainLayout';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Search, UserPlus, MessageCircle, Loader2 } from 'lucide-react';

const UsersPage = () => {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchUsers = async (q = '') => {
    setLoading(true);
    try {
      const res = await api.get('/users/search', { params: { q } });
      setUsers(res.data || []);
    } catch (e) {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Проверяем query параметр из URL
    const urlParams = new URLSearchParams(window.location.search);
    const q = urlParams.get('q');
    if (q) {
      setQuery(q);
      fetchUsers(q);
    } else {
      fetchUsers('');
    }
  }, []);

  const onSearch = (e) => {
    e.preventDefault();
    fetchUsers(query);
  };

  const addFriend = async (userId) => {
    try {
      await api.post('/friends/request', { user_id: userId });
      // Обновляем список, чтобы убрать пользователя из результатов
      fetchUsers(query);
    } catch (e) {
      const errorMsg = e.response?.data?.detail || 'Не удалось отправить заявку';
      alert(errorMsg);
    }
  };

  const startChat = async (userId) => {
    try {
      await api.post('/messages/send', {
        to_user_id: userId,
        content: 'Привет!'
      });
      navigate('/messages');
    } catch (e) {
      console.error('Error starting chat:', e);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <form onSubmit={onSearch} className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск людей по имени или email"
              className="pl-9"
            />
          </div>
          <Button type="submit">Найти</Button>
        </form>

        <div className="space-y-3">
          {loading && (
            <Card>
              <CardContent className="py-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-4" />
                <p className="text-muted-foreground">Загрузка...</p>
              </CardContent>
            </Card>
          )}
          {!loading && users.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Ничего не найдено</p>
                <p className="text-sm text-muted-foreground mt-2">Попробуйте изменить поисковый запрос</p>
              </CardContent>
            </Card>
          )}
          {!loading && users.map((u) => (
            <Card key={u.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={u.avatar_url || undefined} alt={u.username} />
                    <AvatarFallback>{(u.username || 'U')[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{u.username}</div>
                    <div className="text-sm text-muted-foreground truncate">{u.email}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex-1"
                    onClick={() => navigate(`/users/${u.id}`)}
                  >
                    Профиль
                  </Button>
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={() => startChat(u.id)}
                  >
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => addFriend(u.id)}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    В друзья
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default UsersPage;



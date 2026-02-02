import React, { useEffect, useState } from 'react';
import MainLayout from '../components/Layout/MainLayout';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { Search, UserPlus, MessageCircle, Loader2, AlertCircle } from 'lucide-react';
import StatusBadge from '../components/Profile/StatusBadge';

const UsersPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQ = searchParams.get('q') || '';
  const [query, setQuery] = useState(urlQ);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchUsers = async (q = '') => {
    setError('');
    setLoading(true);
    try {
      const res = await api.get('/users/search', { params: { q: q || undefined } });
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setUsers([]);
      const msg = e?.response?.data?.detail || e?.message || 'Ошибка поиска';
      setError(Array.isArray(msg) ? msg[0]?.msg || 'Ошибка' : msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setQuery(urlQ);
    fetchUsers(urlQ);
  }, [urlQ]);

  const onSearch = (e) => {
    e.preventDefault();
    setSearchParams(query.trim() ? { q: query.trim() } : {});
  };

  const [addingId, setAddingId] = useState(null);
  const addFriend = async (userId) => {
    if (addingId === userId) return;
    setAddingId(userId);
    try {
      const res = await api.post('/friends/request', { user_id: userId });
      const status = res.data?.status;
      if (status === 'accepted') {
        setError('');
        fetchUsers(urlQ);
        alert('Теперь вы друзья!');
      } else {
        setError('');
        fetchUsers(urlQ);
        alert('Заявка отправлена');
      }
    } catch (e) {
      const errorMsg = e?.response?.data?.detail || 'Не удалось отправить заявку';
      const msg = typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg);
      setError(msg);
      if (msg.includes('Already friends') || msg.includes('уже друзья')) {
        fetchUsers(urlQ);
      }
    } finally {
      setAddingId(null);
    }
  };

  const startChat = async (userId) => {
    try {
      const res = await api.post('/messages/send', {
        to_user_id: userId,
        content: 'Привет!'
      });
      navigate('/messages', { state: { openConversationId: res.data?.conversation_id } });
    } catch (e) {
      console.error('Error starting chat:', e);
      const msg = e?.response?.data?.detail || 'Не удалось начать чат';
      setError(typeof msg === 'string' ? msg : 'Не удалось начать чат');
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
              onChange={(e) => { setQuery(e.target.value); setError(''); }}
              placeholder="Поиск по имени пользователя (логину)"
              className="pl-9"
            />
          </div>
          <Button type="submit" disabled={loading}>Найти</Button>
        </form>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

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
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{u.username}</span>
                      <StatusBadge status={u.status} className="text-xs shrink-0" />
                    </div>
                    <div className="text-sm text-muted-foreground truncate">{u.email}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex-1"
                    onClick={() => navigate(u.username ? `/profile/@${u.username}` : `/users/${u.id}`)}
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
                    disabled={addingId === u.id}
                  >
                    {addingId === u.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <UserPlus className="w-4 h-4 mr-2" />
                    )}
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



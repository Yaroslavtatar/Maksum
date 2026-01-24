import React, { useEffect, useState } from 'react';
import MainLayout from '../components/Layout/MainLayout';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, UserPlus } from 'lucide-react';

const UsersPage = () => {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchUsers = async (q = '') => {
    setLoading(true);
    try {
      const res = await axios.get('/api/users/search', { params: { q } });
      setUsers(res.data || []);
    } catch (e) {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers('');
  }, []);

  const onSearch = (e) => {
    e.preventDefault();
    fetchUsers(query);
  };

  const addFriend = async (userId) => {
    try {
      await axios.post('/api/friends/request', { user_id: userId });
      alert('Заявка отправлена');
    } catch (e) {
      alert('Не удалось отправить заявку');
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
            <Card><CardContent className="py-6 text-center text-muted-foreground">Загрузка...</CardContent></Card>
          )}
          {!loading && users.map((u) => (
            <Card key={u.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={u.avatar_url || undefined} alt={u.username} />
                  <AvatarFallback>{(u.username || 'U')[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{u.username}</div>
                  <div className="text-sm text-muted-foreground truncate">{u.email}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => navigate(`/users/${u.id}`)}>Открыть</Button>
                  <Button onClick={() => addFriend(u.id)}>
                    <UserPlus className="w-4 h-4 mr-2" />В друзья
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {!loading && users.length === 0 && (
            <Card><CardContent className="py-6 text-center text-muted-foreground">Ничего не найдено</CardContent></Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default UsersPage;



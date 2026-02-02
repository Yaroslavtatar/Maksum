import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useUser } from '../context/UserContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Users, FileText, Building2, Shield, Ban, Trash2, Search, AlertCircle, BarChart3, MessageCircle, Heart, Bell, UserCheck } from 'lucide-react';

const CryAdminPage = () => {
  const { user, loading: userLoading } = useUser();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [skip, setSkip] = useState(0);
  const limit = 20;

  useEffect(() => {
    if (userLoading) return;
    if (!user?.is_admin) navigate('/', { replace: true });
  }, [user, userLoading, navigate]);

  const loadUsers = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await api.get('/admin/users', { params: { skip, limit, search: userSearch || undefined } });
      setUsers(res.data?.users || []);
    } catch (e) {
      setError(e?.response?.data?.detail || 'Ошибка загрузки пользователей');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await api.get('/admin/posts', { params: { skip, limit } });
      setPosts(res.data?.posts || []);
    } catch (e) {
      setError(e?.response?.data?.detail || 'Ошибка загрузки постов');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCommunities = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await api.get('/admin/communities', { params: { skip, limit } });
      setCommunities(res.data?.communities || []);
    } catch (e) {
      setError(e?.response?.data?.detail || 'Ошибка загрузки сообществ');
      setCommunities([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await api.get('/admin/stats');
      setStats(res.data);
    } catch (e) {
      setError(e?.response?.data?.detail || 'Ошибка загрузки статистики');
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'stats') loadStats();
    else if (activeTab === 'users') loadUsers();
    else if (activeTab === 'posts') loadPosts();
    else if (activeTab === 'communities') loadCommunities();
  }, [user?.is_admin, activeTab, skip, userSearch]);

  const handleBan = async (userId, banned) => {
    try {
      await api.patch(`/admin/users/${userId}`, { is_banned: banned });
      loadUsers();
    } catch (e) {
      setError(e?.response?.data?.detail || 'Ошибка');
    }
  };

  const handleSetAdmin = async (userId, isAdmin) => {
    try {
      await api.patch(`/admin/users/${userId}`, { is_admin: isAdmin });
      loadUsers();
    } catch (e) {
      setError(e?.response?.data?.detail || 'Ошибка');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Удалить пост?')) return;
    try {
      await api.delete(`/admin/posts/${postId}`);
      loadPosts();
    } catch (e) {
      setError(e?.response?.data?.detail || 'Ошибка');
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-600 dark:text-gray-400">Загрузка...</p>
      </div>
    );
  }
  if (!user?.is_admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-600 dark:text-gray-400">Доступ запрещён. Только для администраторов.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Shield className="w-8 h-8 text-amber-500" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Админ-панель /cryadmin</h1>
          </div>
          <Button variant="outline" onClick={() => navigate('/')}>На главную</Button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 bg-gray-200 dark:bg-gray-700">
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Статистика
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" /> Пользователи
            </TabsTrigger>
            <TabsTrigger value="posts" className="flex items-center gap-2">
              <FileText className="w-4 h-4" /> Модерация постов
            </TabsTrigger>
            <TabsTrigger value="communities" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Сообщества
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="space-y-4">
            <Card className="bg-white dark:bg-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>Статистика платформы</CardTitle>
                <Button onClick={loadStats}>Обновить</Button>
              </CardHeader>
              <CardContent>
                {loading && !stats ? (
                  <p className="text-gray-500">Загрузка...</p>
                ) : stats ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg border dark:border-gray-600 bg-blue-50 dark:bg-blue-900/20">
                      <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                        <Users className="w-5 h-5" />
                        <span className="font-semibold">Всего пользователей</span>
                      </div>
                      <p className="text-2xl font-bold mt-1">{stats.users?.total ?? 0}</p>
                    </div>
                    <div className="p-4 rounded-lg border dark:border-gray-600 bg-green-50 dark:bg-green-900/20">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                        <UserCheck className="w-5 h-5" />
                        <span className="font-semibold">Активных за 24 ч</span>
                      </div>
                      <p className="text-2xl font-bold mt-1">{stats.users?.active_last_24h ?? 0}</p>
                      <p className="text-xs text-gray-500 mt-0.5">пост или сообщение</p>
                    </div>
                    <div className="p-4 rounded-lg border dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
                      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <Users className="w-5 h-5" />
                        <span className="font-semibold">Зарегистрировано сегодня</span>
                      </div>
                      <p className="text-2xl font-bold mt-1">{stats.users?.registered_today ?? 0}</p>
                    </div>
                    <div className="p-4 rounded-lg border dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">За неделю</span>
                      <p className="text-2xl font-bold mt-1">{stats.users?.registered_this_week ?? 0}</p>
                    </div>
                    <div className="p-4 rounded-lg border dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">За месяц</span>
                      <p className="text-2xl font-bold mt-1">{stats.users?.registered_this_month ?? 0}</p>
                    </div>
                    <div className="p-4 rounded-lg border dark:border-gray-600 bg-amber-50 dark:bg-amber-900/20">
                      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                        <Shield className="w-5 h-5" />
                        <span className="font-semibold">Админов</span>
                      </div>
                      <p className="text-2xl font-bold mt-1">{stats.users?.admins ?? 0}</p>
                    </div>
                    <div className="p-4 rounded-lg border dark:border-gray-600 bg-red-50 dark:bg-red-900/20">
                      <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                        <Ban className="w-5 h-5" />
                        <span className="font-semibold">Забанено</span>
                      </div>
                      <p className="text-2xl font-bold mt-1">{stats.users?.banned ?? 0}</p>
                    </div>
                    <div className="p-4 rounded-lg border dark:border-gray-600 bg-purple-50 dark:bg-purple-900/20">
                      <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                        <FileText className="w-5 h-5" />
                        <span className="font-semibold">Всего постов</span>
                      </div>
                      <p className="text-2xl font-bold mt-1">{stats.posts?.total ?? 0}</p>
                      <p className="text-xs text-gray-500 mt-0.5">сегодня: {stats.posts?.today ?? 0}, за неделю: {stats.posts?.this_week ?? 0}</p>
                    </div>
                    <div className="p-4 rounded-lg border dark:border-gray-600 bg-indigo-50 dark:bg-indigo-900/20">
                      <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                        <MessageCircle className="w-5 h-5" />
                        <span className="font-semibold">Сообщений</span>
                      </div>
                      <p className="text-2xl font-bold mt-1">{stats.messages?.total ?? 0}</p>
                      <p className="text-xs text-gray-500 mt-0.5">сегодня: {stats.messages?.today ?? 0}</p>
                    </div>
                    <div className="p-4 rounded-lg border dark:border-gray-600 bg-pink-50 dark:bg-pink-900/20">
                      <div className="flex items-center gap-2 text-pink-700 dark:text-pink-300">
                        <Heart className="w-5 h-5" />
                        <span className="font-semibold">Дружб (принято)</span>
                      </div>
                      <p className="text-2xl font-bold mt-1">{stats.friendships?.accepted ?? 0}</p>
                    </div>
                    <div className="p-4 rounded-lg border dark:border-gray-600 bg-yellow-50 dark:bg-yellow-900/20">
                      <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                        <Bell className="w-5 h-5" />
                        <span className="font-semibold">Уведомлений</span>
                      </div>
                      <p className="text-2xl font-bold mt-1">{stats.notifications?.total ?? 0}</p>
                      <p className="text-xs text-gray-500 mt-0.5">непрочитанных: {stats.notifications?.unread ?? 0}</p>
                    </div>
                    <div className="p-4 rounded-lg border dark:border-gray-600 bg-teal-50 dark:bg-teal-900/20">
                      <div className="flex items-center gap-2 text-teal-700 dark:text-teal-300">
                        <Building2 className="w-5 h-5" />
                        <span className="font-semibold">Сообществ</span>
                      </div>
                      <p className="text-2xl font-bold mt-1">{stats.communities ?? 0}</p>
                      <p className="text-xs text-gray-500 mt-0.5">профили с названием сообщества</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">Нет данных</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card className="bg-white dark:bg-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>Управление пользователями</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Поиск по логину или email..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-8 w-64"
                    />
                  </div>
                  <Button onClick={loadUsers}>Обновить</Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-gray-500">Загрузка...</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b dark:border-gray-600">
                          <th className="text-left py-2">ID</th>
                          <th className="text-left py-2">Логин</th>
                          <th className="text-left py-2">Email</th>
                          <th className="text-left py-2">Админ</th>
                          <th className="text-left py-2">Бан</th>
                          <th className="text-left py-2">Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => (
                          <tr key={u.id} className="border-b dark:border-gray-700">
                            <td className="py-2">{u.id}</td>
                            <td className="py-2">{u.username}</td>
                            <td className="py-2">{u.email}</td>
                            <td className="py-2">{u.is_admin ? 'Да' : 'Нет'}</td>
                            <td className="py-2">{u.is_banned ? 'Забанен' : '—'}</td>
                            <td className="py-2 flex gap-2">
                              {u.id !== user?.id && (
                                <>
                                  <Button
                                    size="sm"
                                    variant={u.is_banned ? 'default' : 'destructive'}
                                    onClick={() => handleBan(u.id, !u.is_banned)}
                                  >
                                    <Ban className="w-3 h-3 mr-1" />
                                    {u.is_banned ? 'Разбанить' : 'Забанить'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={u.is_admin ? 'secondary' : 'outline'}
                                    onClick={() => handleSetAdmin(u.id, !u.is_admin)}
                                  >
                                    <Shield className="w-3 h-3 mr-1" />
                                    {u.is_admin ? 'Снять админа' : 'Сделать админом'}
                                  </Button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="posts" className="space-y-4">
            <Card className="bg-white dark:bg-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>Модерация постов</CardTitle>
                <Button onClick={loadPosts}>Обновить</Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-gray-500">Загрузка...</p>
                ) : (
                  <div className="space-y-4">
                    {posts.map((p) => (
                      <div
                        key={p.id}
                        className="p-4 rounded-lg border dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              @{p.author_username} · {p.created_at ? new Date(p.created_at).toLocaleString() : ''}
                            </p>
                            <p className="mt-1 break-words">{p.content}</p>
                            {p.images?.length > 0 && (
                              <p className="text-xs text-gray-500 mt-1">Медиа: {p.images.length}</p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeletePost(p.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="communities" className="space-y-4">
            <Card className="bg-white dark:bg-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>Сообщества (профили с названием сообщества)</CardTitle>
                <Button onClick={loadCommunities}>Обновить</Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-gray-500">Загрузка...</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b dark:border-gray-600">
                          <th className="text-left py-2">ID</th>
                          <th className="text-left py-2">Владелец</th>
                          <th className="text-left py-2">Название</th>
                          <th className="text-left py-2">Описание</th>
                        </tr>
                      </thead>
                      <tbody>
                        {communities.map((c) => (
                          <tr key={c.id} className="border-b dark:border-gray-700">
                            <td className="py-2">{c.id}</td>
                            <td className="py-2">{c.username} ({c.email})</td>
                            <td className="py-2">{c.community_name || '—'}</td>
                            <td className="py-2 max-w-xs truncate">{c.community_description || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CryAdminPage;

import React, { useEffect, useState } from 'react';
import MainLayout from '../components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  UserPlus, 
  Users,
  UserCheck,
  Filter,
  Globe,
  Check,
  X,
  Loader2,
  MessageCircle
} from 'lucide-react';

const FriendsPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (activeTab === 'all') {
      fetchFriends();
    } else if (activeTab === 'requests') {
      fetchRequests();
    } else if (activeTab === 'suggestions') {
      fetchSuggestions();
    }
  }, [activeTab]);

  const fetchFriends = async () => {
    try {
      setLoading(true);
      const res = await api.get('/friends');
      setFriends(res.data || []);
    } catch (e) {
      console.error('Error fetching friends:', e);
      setFriends([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/friends/requests');
      setRequests(res.data || { incoming: [], outgoing: [] });
    } catch (e) {
      console.error('Error fetching requests:', e);
      setRequests({ incoming: [], outgoing: [] });
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/friends/suggestions');
      setSuggestions(res.data || []);
    } catch (e) {
      console.error('Error fetching suggestions:', e);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (userId) => {
    try {
      await api.post('/friends/accept', { user_id: userId });
      await fetchRequests();
      await fetchFriends();
    } catch (e) {
      console.error('Error accepting request:', e);
    }
  };

  const handleSendRequest = async (userId) => {
    try {
      await api.post('/friends/request', { user_id: userId });
      await fetchSuggestions();
      await fetchRequests();
    } catch (e) {
      console.error('Error sending request:', e);
    }
  };

  const handleStartChat = async (userId) => {
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

  const filteredFriends = friends.filter((f) => 
    !searchQuery || 
    f.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 animate-slide-down">
          <h1 className="text-2xl font-bold mb-4">Друзья</h1>
          
          {/* Search and Filter */}
          <div className="flex space-x-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Поиск друзей..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 transition-all duration-300 focus:scale-105"
              />
            </div>
            <Button variant="outline" className="animate-scale-hover" onClick={() => navigate('/find-friends')}>
              <UserPlus className="w-4 h-4 mr-2" />
              Найти друзей
            </Button>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 max-w-md">
              <TabsTrigger value="all">
                Все друзья {friends.length > 0 && `(${friends.length})`}
              </TabsTrigger>
              <TabsTrigger value="requests">
                Заявки {requests.incoming.length > 0 && `(${requests.incoming.length})`}
              </TabsTrigger>
              <TabsTrigger value="suggestions">Рекомендации</TabsTrigger>
              <TabsTrigger value="online">Онлайн</TabsTrigger>
            </TabsList>

            {/* All Friends Tab */}
            <TabsContent value="all">
              {loading ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                  </CardContent>
                </Card>
              ) : filteredFriends.length === 0 ? (
                <Card className="animate-fade-in">
                  <CardContent className="text-center py-16">
                    <div className="animate-bounce-gentle mb-6">
                      <Users className="w-20 h-20 text-muted-foreground mx-auto" />
                    </div>
                    <h3 className="text-2xl font-semibold mb-4">У вас пока нет друзей</h3>
                    <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                      Начните добавлять друзей, чтобы делиться моментами и оставаться на связи
                    </p>
                    <div className="space-x-4">
                      <Button className="animate-scale-hover" onClick={() => navigate('/find-friends')}>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Найти друзей
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredFriends.map((friend) => (
                    <Card key={friend.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={friend.avatar_url} alt={friend.username} />
                            <AvatarFallback>{(friend.username || 'U')[0].toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{friend.username}</p>
                            <p className="text-xs text-muted-foreground truncate">{friend.email}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => navigate(`/users/${friend.id}`)}
                          >
                            Профиль
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleStartChat(friend.id)}
                          >
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Friend Requests Tab */}
            <TabsContent value="requests">
              {loading ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                  </CardContent>
                </Card>
              ) : requests.incoming.length === 0 && requests.outgoing.length === 0 ? (
                <Card className="animate-fade-in">
                  <CardContent className="text-center py-16">
                    <div className="animate-pulse-gentle mb-6">
                      <UserCheck className="w-16 h-16 text-muted-foreground mx-auto" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Нет новых заявок</h3>
                    <p className="text-muted-foreground mb-6">
                      Заявки в друзья будут отображаться здесь
                    </p>
                    <Button variant="outline" className="animate-scale-hover" onClick={() => navigate('/find-friends')}>
                      Найти друзей
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {requests.incoming.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Входящие заявки</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {requests.incoming.map((req) => (
                          <Card key={req.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3 mb-3">
                                <Avatar>
                                  <AvatarImage src={req.avatar_url} alt={req.username} />
                                  <AvatarFallback>{(req.username || 'U')[0].toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{req.username}</p>
                                  <p className="text-xs text-muted-foreground truncate">{req.email}</p>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => handleAcceptRequest(req.user_id)}
                                >
                                  <Check className="w-4 h-4 mr-2" />
                                  Принять
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate(`/users/${req.user_id}`)}
                                >
                                  Профиль
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                  {requests.outgoing.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Исходящие заявки</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {requests.outgoing.map((req) => (
                          <Card key={req.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3 mb-3">
                                <Avatar>
                                  <AvatarImage src={req.avatar_url} alt={req.username} />
                                  <AvatarFallback>{(req.username || 'U')[0].toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{req.username}</p>
                                  <p className="text-xs text-muted-foreground truncate">{req.email}</p>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1"
                                  disabled
                                >
                                  Ожидание
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate(`/users/${req.user_id}`)}
                                >
                                  Профиль
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Suggestions Tab */}
            <TabsContent value="suggestions">
              {loading ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                  </CardContent>
                </Card>
              ) : suggestions.length === 0 ? (
                <Card className="animate-fade-in">
                  <CardContent className="text-center py-16">
                    <div className="animate-bounce-gentle mb-6">
                      <Users className="w-16 h-16 text-muted-foreground mx-auto" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Рекомендации появятся позже</h3>
                    <p className="text-muted-foreground mb-6">
                      Мы подберем для вас интересных людей на основе ваших интересов
                    </p>
                    <Button className="animate-scale-hover" onClick={() => navigate('/find-friends')}>
                      <Search className="w-4 h-4 mr-2" />
                      Поиск по интересам
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {suggestions.map((user) => (
                    <Card key={user.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={user.avatar_url} alt={user.username} />
                            <AvatarFallback>{(user.username || 'U')[0].toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{user.username}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => handleSendRequest(user.id)}
                          >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Добавить
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/users/${user.id}`)}
                          >
                            Профиль
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Online Friends Tab */}
            <TabsContent value="online">
              <Card className="animate-fade-in">
                <CardContent className="text-center py-16">
                  <div className="animate-pulse-gentle mb-6">
                    <div className="relative">
                      <Users className="w-16 h-16 text-muted-foreground mx-auto" />
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background"></div>
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Никого нет в сети</h3>
                  <p className="text-muted-foreground mb-6">
                    Друзья онлайн будут отображаться в этом разделе
                  </p>
                  <Button variant="outline" className="animate-scale-hover" onClick={fetchFriends}>
                    Обновить список
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
};

export default FriendsPage;

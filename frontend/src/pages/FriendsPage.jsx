import React, { useEffect, useState } from 'react';
import MainLayout from '../components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  UserPlus, 
  Users,
  UserCheck,
  Filter,
  Globe
} from 'lucide-react';

const FriendsPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [friends, setFriends] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get('/api/friends');
        setFriends(res.data || []);
      } catch (e) {
        setFriends([]);
      }
    })();
  }, []);

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 animate-slide-down">
          <h1 className="text-2xl font-bold mb-4">Друзья</h1>
          
          {/* Search and Filter */}
          <div className="flex space-x-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Поиск друзей..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 transition-all duration-300 focus:scale-105"
              />
            </div>
            <Button variant="outline" className="animate-scale-hover">
              <Filter className="w-4 h-4 mr-2" />
              Фильтры
            </Button>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 max-w-md">
              <TabsTrigger value="all">Все друзья</TabsTrigger>
              <TabsTrigger value="requests">Заявки</TabsTrigger>
              <TabsTrigger value="suggestions">Рекомендации</TabsTrigger>
              <TabsTrigger value="online">Онлайн</TabsTrigger>
            </TabsList>

            {/* All Friends Tab */}
            <TabsContent value="all">
              {friends.length === 0 ? (
                <Card className="animate-fade-in">
                  <CardContent className="text-center py-16">
                    <div className="animate-bounce-gentle mb-6">
                      <Users className="w-20 h-20 text-gray-400 mx-auto" />
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-700 mb-4">У вас пока нет друзей</h3>
                    <p className="text-gray-500 mb-8 max-w-md mx-auto">
                      Начните добавлять друзей, чтобы делиться моментами и оставаться на связи
                    </p>
                    <div className="space-x-4">
                      <Button className="animate-scale-hover" onClick={() => navigate('/find-friends')}>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Найти друзей
                      </Button>
                      <Button variant="outline" className="animate-scale-hover">
                        <Globe className="w-4 h-4 mr-2" />
                        Импорт контактов
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {friends
                    .filter((f) => !searchQuery || f.username.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((friend) => (
                      <Card key={friend.id}>
                        <CardContent className="p-4 flex items-center gap-3">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-muted">
                              <img src={friend.avatar_url || undefined} alt={friend.username} className="w-full h-full object-cover" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{friend.username}</p>
                            <p className="text-xs text-muted-foreground truncate">{friend.email}</p>
                          </div>
                          <Button variant="outline" onClick={() => navigate(`/users/${friend.id}`)}>Открыть</Button>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </TabsContent>

            {/* Friend Requests Tab */}
            <TabsContent value="requests">
              <Card className="animate-fade-in">
                <CardContent className="text-center py-16">
                  <div className="animate-pulse-gentle mb-6">
                    <UserCheck className="w-16 h-16 text-gray-400 mx-auto" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">Нет новых заявок</h3>
                  <p className="text-gray-500 mb-6">
                    Заявки в друзья будут отображаться здесь
                  </p>
                  <Button variant="outline" className="animate-scale-hover">
                    Пригласить друзей
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Suggestions Tab */}
            <TabsContent value="suggestions">
              <Card className="animate-fade-in">
                <CardContent className="text-center py-16">
                  <div className="animate-bounce-gentle mb-6">
                    <Users className="w-16 h-16 text-gray-400 mx-auto" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">Рекомендации появятся позже</h3>
                  <p className="text-gray-500 mb-6">
                    Мы подберем для вас интересных людей на основе ваших интересов
                  </p>
                  <Button className="animate-scale-hover">
                    <Search className="w-4 h-4 mr-2" />
                    Поиск по интересам
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Online Friends Tab */}
            <TabsContent value="online">
              <Card className="animate-fade-in">
                <CardContent className="text-center py-16">
                  <div className="animate-pulse-gentle mb-6">
                    <div className="relative">
                      <Users className="w-16 h-16 text-gray-400 mx-auto" />
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">Никого нет в сети</h3>
                  <p className="text-gray-500 mb-6">
                    Друзья онлайн будут отображаться в этом разделе
                  </p>
                  <Button variant="outline" className="animate-scale-hover">
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
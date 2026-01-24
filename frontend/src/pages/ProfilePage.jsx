import React, { useEffect, useState } from 'react';
import MainLayout from '../components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { mockPosts } from '../mock/mockData';
import axios from 'axios';
import PostCard from '../components/Feed/PostCard';
import { 
  MapPin, 
  Calendar, 
  Users, 
  Camera, 
  Edit,
  Phone,
  Mail,
  Globe,
  Heart,
  MessageCircle,
  UserPlus,
  MoreHorizontal
} from 'lucide-react';

const ProfilePage = () => {
  const [activeTab, setActiveTab] = useState('posts');
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await axios.get('/api/users/me');
        if (mounted) setMe(res.data);
      } catch (e) {
        if (mounted) setMe(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const userPosts = [];

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        {/* Cover Photo & Profile Info */}
        <Card className="mb-6">
          <div className="relative">
            {/* Cover Photo */}
            <div 
              className="h-64 bg-gradient-to-r from-blue-400 to-purple-500 rounded-t-lg"
              style={{ backgroundSize: 'cover', backgroundPosition: 'center' }}
            >
              <div className="absolute inset-0 bg-black/20 rounded-t-lg"></div>
              {true && (
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="absolute top-4 right-4 bg-white/90 hover:bg-white"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Изменить обложку
                </Button>
              )}
            </div>

            {/* Profile Picture */}
            <div className="absolute -bottom-12 left-6">
              <div className="relative">
                <Avatar className="w-24 h-24 border-4 border-white">
                  <AvatarImage src={(me && me.avatar_url) || undefined} alt={me?.username || ''} />
                  <AvatarFallback className="text-2xl">{(me?.username || 'U')[0]}</AvatarFallback>
                </Avatar>
                {true && (
                  <Button 
                    size="sm" 
                    className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0 bg-gray-100 hover:bg-gray-200 text-gray-600"
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                )}
                {true && (
                  <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                )}
              </div>
            </div>
          </div>

          <CardContent className="pt-16 pb-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-2xl font-bold">{me?.username || 'Профиль'}</h1>
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    В сети
                  </Badge>
                </div>
                <p className="text-gray-600 mb-4">{me?.email}</p>
                
                <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    Город не указан
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    Дата не указана
                  </div>
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    0 подписчиков
                  </div>
                </div>

                <div className="flex space-x-4 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-lg">0</div>
                    <div className="text-gray-500">Записи</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-lg">0</div>
                    <div className="text-gray-500">Подписчики</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-lg">0</div>
                    <div className="text-gray-500">Подписки</div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2">
                {true ? (
                  <Button variant="outline">
                    <Edit className="w-4 h-4 mr-2" />
                    Редактировать
                  </Button>
                ) : (
                  <>
                    <Button>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Добавить в друзья
                    </Button>
                    <Button variant="outline">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Сообщение
                    </Button>
                    <Button variant="outline" size="sm">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="posts">Записи</TabsTrigger>
            <TabsTrigger value="photos">Фотографии</TabsTrigger>
            <TabsTrigger value="friends">Друзья</TabsTrigger>
            <TabsTrigger value="info">Информация</TabsTrigger>
          </TabsList>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <TabsContent value="posts" className="space-y-4">
                {userPosts.length > 0 ? (
                  userPosts.map((post) => (
                    <PostCard key={post.id} post={post} onLike={() => {}} />
                  ))
                ) : (
                  <Card>
                    <CardContent className="text-center py-8">
                      <p className="text-gray-500">Пока нет записей</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="photos">
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-gray-500">Фотографии будут отображаться здесь</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="friends">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {mockFriends.map((friend) => (
                    <Card key={friend.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <Avatar>
                              <AvatarImage src={friend.avatar} alt={friend.name} />
                              <AvatarFallback>{friend.name[0]}</AvatarFallback>
                            </Avatar>
                            {friend.isOnline && (
                              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{friend.name}</p>
                            <p className="text-xs text-gray-500">
                              {friend.isOnline ? 'В сети' : friend.lastSeen}
                            </p>
                            <p className="text-xs text-gray-400">
                              {friend.mutualFriends} общих друзей
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="info">
                <Card>
                  <CardHeader>
                    <CardTitle>Основная информация</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Дата рождения</p>
                        <p className="text-sm">{mockUser.birthDate}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Город</p>
                        <p className="text-sm">{mockUser.location}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Статус</p>
                        <p className="text-sm">{mockUser.bio}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>

            {/* Right Sidebar */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Контакты</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-3 text-sm">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>+7 (999) 123-45-67</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>ivan@example.com</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <span>ivan-dev.ru</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-lg">Статистика</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Просмотры профиля</span>
                    <span className="font-medium">1,234</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Лайки за месяц</span>
                    <span className="font-medium">567</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Комментарии</span>
                    <span className="font-medium">890</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default ProfilePage;
import React, { useEffect, useState } from 'react';
import MainLayout from '../components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { useUser } from '../context/UserContext';
import PostCard from '../components/Feed/PostCard';
import EditProfileModal from '../components/Profile/EditProfileModal';
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
  const [editModalOpen, setEditModalOpen] = useState(false);
  const { user, loading, posts, friends, fetchMyPosts, fetchFriends, likePost, fetchUser } = useUser();

  useEffect(() => {
    fetchMyPosts();
    fetchFriends();
  }, [fetchMyPosts, fetchFriends]);

  const handleProfileUpdate = async (updatedData) => {
    // Данные уже обновлены в контексте через updateProfile
    // Просто закрываем модалку
  };

  const handleLike = async (postId) => {
    try {
      await likePost(postId);
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-500">Загрузка профиля...</p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        {/* Cover Photo & Profile Info */}
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
              {user && (
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="absolute top-4 right-4 bg-background/95 hover:bg-background text-foreground border-2 border-border shadow-xl backdrop-blur-md font-medium"
                  onClick={() => setEditModalOpen(true)}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Изменить обложку
                </Button>
              )}
            </div>

            {/* Profile Picture */}
            <div className="absolute -bottom-12 left-6">
              <div className="relative">
                <Avatar className="w-28 h-28 border-4 border-white shadow-xl">
                  <AvatarImage src={(user && user.avatar_url) || undefined} alt={user?.username || ''} />
                  <AvatarFallback className="text-3xl bg-gradient-to-br from-blue-400 to-purple-500 text-white">
                    {(user?.username || 'U')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {user && (
                  <Button 
                    size="sm" 
                    className="absolute -bottom-2 -right-2 rounded-full w-10 h-10 p-0 bg-blue-500 hover:bg-blue-600 text-white shadow-lg"
                    onClick={() => setEditModalOpen(true)}
                  >
                    <Camera className="w-5 h-5" />
                  </Button>
                )}
                {user && (
                  <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 rounded-full border-3 border-white shadow-md"></div>
                )}
              </div>
            </div>
          </div>

          <CardContent className="pt-16 pb-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-2xl font-bold">{user?.username || 'Профиль'}</h1>
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    В сети
                  </Badge>
                </div>
                <p className="text-gray-600 mb-4">{user?.email}</p>
                
                {user?.bio && (
                  <p className="text-gray-700 dark:text-gray-300 mb-4">{user.bio}</p>
                )}
                
                <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
                  {user?.location && (
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      {user.location}
                    </div>
                  )}
                  {user?.birth_date && (
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {user.birth_date}
                    </div>
                  )}
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    {friends.length} {friends.length === 1 ? 'друг' : friends.length < 5 ? 'друга' : 'друзей'}
                  </div>
                </div>

                <div className="flex space-x-6 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-xl">{posts.length}</div>
                    <div className="text-gray-500">Записи</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-xl">{friends.length}</div>
                    <div className="text-gray-500">Друзья</div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2">
                {user && (
                  <Button variant="outline" onClick={() => setEditModalOpen(true)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Редактировать
                  </Button>
                )}
                {false && (
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
                {posts.length > 0 ? (
                  posts.map((post) => (
                    <PostCard key={post.id} post={post} onLike={() => handleLike(post.id)} />
                  ))
                ) : (
                  <Card>
                    <CardContent className="text-center py-8">
                      <p className="text-gray-500">Пока нет записей</p>
                      <p className="text-sm text-gray-400 mt-2">Напишите свой первый пост!</p>
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
                {friends.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {friends.map((friend) => (
                      <Card key={friend.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className="relative">
                              <Avatar>
                                <AvatarImage src={friend.avatar_url} alt={friend.username} />
                                <AvatarFallback>{(friend.username || 'U')[0].toUpperCase()}</AvatarFallback>
                              </Avatar>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{friend.username}</p>
                              <p className="text-xs text-gray-500">{friend.email}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="text-center py-8">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">У вас пока нет друзей</p>
                      <Button variant="outline" className="mt-4" onClick={() => window.location.href = '/find-friends'}>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Найти друзей
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="info">
                <Card>
                  <CardHeader>
                    <CardTitle>Основная информация</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Имя пользователя</p>
                        <p className="text-sm">{user?.username || 'Не указано'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Email</p>
                        <p className="text-sm">{user?.email || 'Не указано'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Город</p>
                        <p className="text-sm">{user?.location || 'Не указано'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">О себе</p>
                        <p className="text-sm">{user?.bio || 'Не указано'}</p>
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
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>{user?.email || 'Не указано'}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-lg">Статистика</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Постов</span>
                    <span className="font-medium">{posts.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Друзей</span>
                    <span className="font-medium">{friends.length}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </Tabs>
      </div>

      {/* Edit Profile Modal */}
      {user && (
        <EditProfileModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          user={user}
          onUpdate={handleProfileUpdate}
        />
      )}
    </MainLayout>
  );
};

export default ProfilePage;
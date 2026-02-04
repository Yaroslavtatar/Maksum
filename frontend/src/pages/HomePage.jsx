import React from 'react';
import MainLayout from '../components/Layout/MainLayout';
import NewsFeed from '../components/Feed/NewsFeed';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { mockFriends, mockGroups } from '../mock/mockData';
import { Users, Music, UserPlus, Users as GroupIcon } from 'lucide-react';

const HomePage = () => {
  return (
    <MainLayout>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Empty States */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="animate-slide-right">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Users className="w-5 h-5 mr-2 text-green-500" />
                Друзья онлайн
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center py-8">
              <div className="animate-bounce-gentle">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              </div>
              <p className="text-gray-500 mb-4">Нет друзей онлайн</p>
              <Button size="sm" variant="outline" className="animate-scale-hover">
                <UserPlus className="w-4 h-4 mr-2" />
                Найти друзей
              </Button>
            </CardContent>
          </Card>

          <Card className="animate-slide-right" style={{ animationDelay: '200ms' }}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <GroupIcon className="w-5 h-5 mr-2 text-blue-500" />
                Мои группы
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center py-8">
              <div className="animate-bounce-gentle">
                <GroupIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              </div>
              <p className="text-gray-500 mb-4">Вы не состоите в группах</p>
              <Button size="sm" variant="outline" className="animate-scale-hover">
                Найти группы
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Main Content - News Feed */}
        <div className="lg:col-span-2">
          <NewsFeed />
        </div>

        {/* Right Sidebar - Empty States */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="animate-slide-left">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Music className="w-5 h-5 mr-2 text-green-500" />
                Музыка
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center py-6">
              <div className="animate-pulse-gentle">
                <Music className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              </div>
              <p className="text-sm text-gray-500 mb-4">Библиотека пуста</p>
              <Button size="sm" variant="outline" className="animate-scale-hover">
                Найти музыку
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default HomePage;
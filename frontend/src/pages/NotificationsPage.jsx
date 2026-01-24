import React, { useState } from 'react';
import MainLayout from '../components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { mockNotifications } from '../mock/mockData';
import { 
  Bell, 
  Settings,
  Heart,
  MessageCircle,
  Users,
  CheckCircle
} from 'lucide-react';

const NotificationsPage = () => {
  const [activeTab, setActiveTab] = useState('all');

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6 animate-slide-down">
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold">Уведомления</h1>
          </div>
          
          <Button variant="outline" size="sm" className="animate-scale-hover">
            <Settings className="w-4 h-4 mr-2" />
            Настройки
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 max-w-md mb-6">
            <TabsTrigger value="all">Все</TabsTrigger>
            <TabsTrigger value="friends">Друзья</TabsTrigger>
            <TabsTrigger value="likes">Активность</TabsTrigger>
            <TabsTrigger value="other">Другое</TabsTrigger>
          </TabsList>

          {/* All Notifications */}
          <TabsContent value="all">
            <Card className="animate-fade-in">
              <CardContent className="text-center py-16">
                <div className="animate-bounce-gentle mb-6">
                  <Bell className="w-20 h-20 text-gray-400 mx-auto" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-700 mb-4">Нет уведомлений</h3>
                <p className="text-gray-500 mb-8 max-w-md mx-auto">
                  Все ваши уведомления будут отображаться здесь. 
                  Начните активность, чтобы получать уведомления от друзей!
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-lg mx-auto">
                  <div className="p-4 bg-gray-50 rounded-lg animate-slide-up" style={{ animationDelay: '200ms' }}>
                    <Heart className="w-8 h-8 text-red-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Лайки и реакции</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg animate-slide-up" style={{ animationDelay: '400ms' }}>
                    <MessageCircle className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Комментарии</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg animate-slide-up" style={{ animationDelay: '600ms' }}>
                    <Users className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Заявки в друзья</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Friend Requests */}
          <TabsContent value="friends">
            <Card className="animate-fade-in">
              <CardContent className="text-center py-12">
                <div className="animate-pulse-gentle mb-6">
                  <Users className="w-16 h-16 text-gray-400 mx-auto" />
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Нет заявок в друзья</h3>
                <p className="text-gray-500">
                  Новые заявки в друзья появятся в этом разделе
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Likes and Comments */}
          <TabsContent value="likes">
            <Card className="animate-fade-in">
              <CardContent className="text-center py-12">
                <div className="animate-bounce-gentle mb-6">
                  <Heart className="w-16 h-16 text-gray-400 mx-auto" />
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Нет активности</h3>
                <p className="text-gray-500">
                  Лайки и комментарии к вашим постам будут здесь
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Other Notifications */}
          <TabsContent value="other">
            <Card className="animate-fade-in">
              <CardContent className="text-center py-12">
                <div className="animate-pulse-gentle mb-6">
                  <CheckCircle className="w-16 h-16 text-gray-400 mx-auto" />
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Все просмотрено!</h3>
                <p className="text-gray-500">
                  Другие уведомления будут отображаться здесь
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default NotificationsPage;
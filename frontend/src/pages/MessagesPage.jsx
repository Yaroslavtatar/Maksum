import React, { useState } from 'react';
import MainLayout from '../components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { mockMessages, mockUser } from '../mock/mockData';
import { 
  Search, 
  MessageCircle, 
  Plus,
  Users
} from 'lucide-react';

const MessagesPage = () => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <MainLayout>
      <div className="h-[calc(100vh-7rem)] flex">
        {/* Chat List */}
        <Card className="w-80 mr-4 flex flex-col animate-slide-right">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Сообщения</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Поиск диалогов..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 transition-all duration-300 focus:scale-105"
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            {/* Empty State */}
            <div className="flex flex-col items-center justify-center h-full py-12">
              <div className="animate-bounce-gentle mb-6">
                <MessageCircle className="w-16 h-16 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Нет сообщений</h3>
              <p className="text-gray-500 text-center text-sm mb-6 px-4">
                Начните общение с друзьями или найдите новых собеседников
              </p>
              <Button className="animate-scale-hover">
                <Plus className="w-4 h-4 mr-2" />
                Начать чат
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Chat Window */}
        <Card className="flex-1 flex flex-col animate-slide-left">
          <CardContent className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-pulse-gentle mb-6">
                <Users className="w-20 h-20 text-gray-400 mx-auto" />
              </div>
              <h2 className="text-2xl font-bold text-gray-700 mb-4">Добро пожаловать в сообщения!</h2>
              <p className="text-gray-500 mb-6 max-w-md">
                Выберите диалог из списка или начните новую беседу с друзьями
              </p>
              <div className="space-y-3">
                <Button className="animate-scale-hover">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Найти друзей для общения
                </Button>
                <div className="text-sm text-gray-400">
                  <p>Все ваши сообщения будут отображаться здесь</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default MessagesPage;